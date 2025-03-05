const express = require('express');
const path = require('path');
const XLSX = require('xlsx');
const app = express();
const port = 3001;

// JSONパーサーの追加
app.use(express.json());

// 静的ファイルの提供
app.use(express.static('public'));

// ExcelファイルからデータをJSON形式で返すAPI
app.get('/api/data', (req, res) => {
    try {
        const workbook = XLSX.readFile(path.join(__dirname, 'PCI.xlsx'));
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);
        console.log('データ読み込み完了:', data.length, '件');
        res.json(data);
    } catch (error) {
        console.error('エラー発生:', error);
        res.status(500).json({ error: 'Failed to read Excel file' });
    }
});

// 備考保存用のエンドポイント
app.post('/api/save-note', (req, res) => {
    try {
        const { circleData, note } = req.body;
        const workbook = XLSX.readFile(path.join(__dirname, 'PCI.xlsx'));
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);

        const targetRow = data.findIndex(row => 
            row.判断円 === circleData.判断円 && 
            row.タイプ === circleData.タイプ && 
            row.名称 === circleData.名称
        );

        if (targetRow !== -1) {
            data[targetRow].備考 = note;
            const newWorksheet = XLSX.utils.json_to_sheet(data);
            workbook.Sheets[workbook.SheetNames[0]] = newWorksheet;
            XLSX.writeFile(workbook, path.join(__dirname, 'PCI.xlsx'));
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'データが見つかりません' });
        }
    } catch (error) {
        console.error('備考の保存に失敗:', error);
        res.status(500).json({ error: '備考の保存に失敗しました' });
    }
});

// メインページの提供
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// サーバー起動
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
