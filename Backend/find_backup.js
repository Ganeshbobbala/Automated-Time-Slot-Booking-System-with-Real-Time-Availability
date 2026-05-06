const fs = require('fs');
const path = require('path');
const historyDir = 'C:\\Users\\ganes\\AppData\\Roaming\\Cursor\\User\\History';

function findLatestServerJs(dir, limit=5) {
    let filesList = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (let entry of entries) {
            if (entry.name === '.antigravityignore') continue;
            const res = path.resolve(dir, entry.name);
            if (entry.isDirectory()) {
                filesList = filesList.concat(findLatestServerJs(res, limit - 1));
            } else {
                filesList.push(res);
            }
        }
    } catch(e) {}
    return filesList;
}

try {
    const allFiles = findLatestServerJs(historyDir);
    const validFiles = allFiles.map(f => {
        try {
            const stat = fs.statSync(f);
            return { path: f, mtime: stat.mtimeMs, size: stat.size };
        } catch(e){ return null; }
    }).filter(x => x !== null && x.size > 500 && x.size < 50000);

    validFiles.sort((a,b) => b.mtime - a.mtime);
    
    let cnt = 0;
    for (let f of validFiles) {
        try {
            const content = fs.readFileSync(f.path, 'utf8');
            if (content.includes('customerName') && content.includes('/api/bookings') && content.includes('calculateHash')) {
                console.log('FOUND:', f.path, new Date(f.mtime).toLocaleString(), 'size:', f.size);
                fs.writeFileSync(`restored_${cnt}.js`, content);
                cnt++;
                if(cnt >= 5) break;
            }
        } catch(e) {}
    }
    if (cnt === 0) console.log("Did not find any file matching.");
} catch (e) {
    console.error(e);
}
