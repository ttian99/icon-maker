var fs = require('fs-extra');
var images = require('images');
var path = require('path');
const { glob } = require('glob');

/** 获取目标文件名称 */
function getBaseName(filePath) {
    if (!filePath) return '';
    var baseName = path.basename(filePath);
    var extName = path.extname(filePath);
    baseName = baseName.replace(extName, '');
    return baseName;
}

/** 读取图片并且改变尺寸 */
async function make(src, out, size) {
    return new Promise((resolve, reject) => {
        fs.ensureFileSync(out);
        images(src).size(size, size).save(out);
        resolve();
    });
}

/** 安卓icon */
async function makeAndroid(iconSrc) {
    console.log('start makeAndroid');
    var baseName = getBaseName(iconSrc);
    console.log('baseName = ' + baseName);
    if (!iconSrc) return;

    var outDir = path.join(__dirname, 'out', baseName);
    fs.emptyDirSync(outDir);

    const arr = [
        { filePath: 'android/mipmap-hdpi/ic_launcher.png', size: 72 },
        { filePath: 'android/mipmap-ldpi/ic_launcher.png', size: 36 },
        { filePath: 'android/mipmap-mdpi/ic_launcher.png', size: 48 },
        { filePath: 'android/mipmap-xhdpi/ic_launcher.png', size: 96 },
        { filePath: 'android/mipmap-xxhdpi/ic_launcher.png', size: 144 },
        { filePath: 'android/mipmap-xxxhdpi/ic_launcher.png', size: 192 },
        { filePath: 'android/ic_launcher.png', size: 512 },
    ];

    for (let i = 0; i < arr.length; i++) {
        const data = arr[i];
        var outFile = path.join(outDir, data.filePath);
        console.log('i = ' + i + ' , outFile = ' + outFile);
        await make(iconSrc, outFile, data.size);
    }

    await makeAndroidPreview(outDir);
    console.log('finish makeAndroid');
}

/** android合成预览图 */
async function makeAndroidPreview(outDir) {
    var srcFile = path.join(__dirname, 'tpl', 'nexus5.png');
    var outFile = path.join(outDir, 'android_preview.png');
    var iconFile = path.join(outDir, 'android/ic_launcher.png');
    // 图标
    var icon = images(iconFile).resize(64);
    fs.ensureFileSync(outFile);
    images(srcFile).draw(icon, 50, 180).save(outFile);
    console.log('preview-image: ' + outFile);
}

/** 苹果icon */
async function makeIos(iconSrc) {
    console.log('start makeIos');
    var baseName = getBaseName(iconSrc);
    console.log('baseName = ' + baseName);
    if (!iconSrc) return;

    var outDir = path.join(__dirname, 'out', baseName, 'ios', 'AppIcon.appiconset');
    fs.emptyDirSync(outDir);
    var jsonFile = path.join(__dirname, 'tpl', 'Contents.json');
    var cfg = fs.readJsonSync(jsonFile, { encoding: 'utf8' });
    var arr = cfg.images;

    for (let i = 0; i < arr.length; i++) {
        const data = arr[i];
        var outFile = path.join(outDir, data.filename);
        const size = parseInt(data.size);
        console.log('i = ' + i + ' , outFile = ' + outFile);
        await make(iconSrc, outFile, size);
    }

    await makeIosPreview(outDir);
    fs.copySync(path.join(__dirname, 'tpl/Contents.json'), path.join(outDir, 'Contents.json'));
    console.log('finish makeIos');
}
/** ios合成预览图 */
async function makeIosPreview(outDir) {
    var srcFile = path.join(__dirname, 'tpl', 'iphonex.png');
    var outFile = path.join(outDir, '../..', 'ios_preview.png');
    var iconFile = path.join(outDir, 'icon-60@2x.png');
    // 图标
    var icon = images(iconFile).resize(60);
    fs.ensureFileSync(outFile);
    images(srcFile).draw(icon, 55, 311).save(outFile);
    console.log('preview-image: ' + outFile);
}

function main() {
    fs.ensureDirSync(__dirname, 'out');
    fs.ensureDirSync(__dirname, 'src');
    glob('src/**\.?(png|jpg)', async function (err, arr) {
        if (err) {
            console.error(err);
            return;
        }
        console.log(arr);

        for (let i = 0; i < arr.length; i++) {
            const file = arr[i];
            await makeAndroid(file);
            await makeIos(file);
        }
    });
}
main();