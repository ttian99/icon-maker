const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const sharp = require('sharp');

/** 获取目标文件名称 */
const getBaseName = (filePath) => {
    if (!filePath) return '';
    const baseName = path.basename(filePath);
    const extName = path.extname(filePath);
    return baseName.replace(extName, '');
};

/** 读取图片并且改变尺寸 */
const resizeImg = async (src, out, size) => {
    try {
        await fs.ensureFile(out);
        await sharp(src)
            .resize(size, size)
            .toFile(out);
        console.log(`Successfully resized image to ${size}x${size}: ${out}`);
    } catch (error) {
        console.error(`Error resizing image ${src}:`, error);
        throw error;
    }
};

/** 安卓icon */
const makeAndroid = async (iconSrc) => {
    try {
        console.log('开始生成 Android 图标...');
        const baseName = getBaseName(iconSrc);
        if (!iconSrc) {
            throw new Error('未提供图标源文件');
        }

        const outDir = path.join(__dirname, 'out', baseName);
        await fs.emptyDir(outDir);

        const androidSizes = [
            { filePath: 'android/mipmap-hdpi/ic_launcher.png', size: 72 },
            { filePath: 'android/mipmap-ldpi/ic_launcher.png', size: 36 },
            { filePath: 'android/mipmap-mdpi/ic_launcher.png', size: 48 },
            { filePath: 'android/mipmap-xhdpi/ic_launcher.png', size: 96 },
            { filePath: 'android/mipmap-xxhdpi/ic_launcher.png', size: 144 },
            { filePath: 'android/mipmap-xxxhdpi/ic_launcher.png', size: 192 },
            { filePath: 'android/ic_launcher.png', size: 512 },
        ];

        await Promise.all(androidSizes.map(async ({ filePath, size }) => {
            const outFile = path.join(outDir, filePath);
            await resizeImg(iconSrc, outFile, size);
        }));

        await makeAndroidPreview(outDir);
        console.log('Android 图标生成完成');
    } catch (error) {
        console.error('生成 Android 图标时出错:', error);
        throw error;
    }
};

/** android合成预览图 */
const makeAndroidPreview = async (outDir) => {
    try {
        const srcFile = path.join(__dirname, 'tpl', 'nexus5.png');
        const outFile = path.join(outDir, 'android_preview.png');
        const iconFile = path.join(outDir, 'android/mipmap-mdpi/ic_launcher.png');

        await fs.ensureFile(outFile);
        const icon = await sharp(iconFile).resize(64).toBuffer();

        await sharp(srcFile)
            .composite([{ input: icon, blend: 'over', top: 490, left: 140 }])
            .toFile(outFile);

        console.log('Android 预览图生成完成:', outFile);
    } catch (error) {
        console.error('生成 Android 预览图时出错:', error);
        throw error;
    }
};

/** 苹果icon */
const makeIos = async (iconSrc) => {
    try {
        console.log('开始生成 iOS 图标...');
        const baseName = getBaseName(iconSrc);
        if (!iconSrc) {
            throw new Error('未提供图标源文件');
        }

        const outDir = path.join(__dirname, 'out', baseName, 'ios', 'AppIcon.appiconset');
        await fs.emptyDir(outDir);

        const jsonFile = path.join(__dirname, 'tpl', 'Contents.json');
        const cfg = await fs.readJson(jsonFile, { encoding: 'utf8' });
        const { images } = cfg;

        await Promise.all(images.map(async ({ filename, size }) => {
            const outFile = path.join(outDir, filename);
            await resizeImg(iconSrc, outFile, parseInt(size));
        }));

        await makeIosPreview(outDir);
        await fs.copy(
            path.join(__dirname, 'tpl/Contents.json'),
            path.join(outDir, 'Contents.json')
        );
        console.log('iOS 图标生成完成');
    } catch (error) {
        console.error('生成 iOS 图标时出错:', error);
        throw error;
    }
};

/** ios合成预览图 */
const makeIosPreview = async (outDir) => {
    try {
        const srcFile = path.join(__dirname, 'tpl', 'iphone14.jpg');
        const outFile = path.join(outDir, '../..', 'iphone_preview.png');
        const iconFile = path.join(outDir, 'icon-60@2x.png');

        await fs.ensureFile(outFile);
        const icon = await sharp(iconFile).resize(68).toBuffer();

        await sharp(srcFile)
            .composite([{ input: icon, blend: 'over', top: 196, left: 51 }])
            .toFile(outFile);

        console.log('iOS 预览图生成完成:', outFile);
    } catch (error) {
        console.error('生成 iOS 预览图时出错:', error);
        throw error;
    }
};

const main = async () => {
    try {
        await fs.ensureDir(path.join(__dirname, 'out'));
        await fs.ensureDir(path.join(__dirname, 'src'));

        // 使用更简单的 glob 模式
        const files = glob.sync('src/*.{png,jpg}');
        if (!files || files.length === 0) {
            console.warn('警告: 在 src 目录下没有找到图片文件');
            return;
        }
        console.log('找到以下图片文件:', files);
        
        for (const file of files) {
            console.log(`\n处理文件: ${file}`);
            await makeAndroid(file);
            await makeIos(file);
        }

        console.log('\n所有图标生成完成！');
    } catch (error) {
        console.error('程序执行出错:', error);
        process.exit(1);
    }
};

main();