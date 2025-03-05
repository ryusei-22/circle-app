// グローバル変数
let canvas;
let ctx;
let parentCircle = null;
let childCircles = [];
let selectedChildCircle = null;
let draggedCircle = null;

// 定数
const SCALE_FACTOR = 200;

// 円の状態と直径パターンを表す色の定義
const CIRCLE_COLORS = {
    // 最大外径（パターン1）用の色
    pattern1: {
        normal: 'rgba(0, 64, 255, 0.5)',
        circleOverlap: 'rgba(255, 128, 0, 0.5)',
        parentOverlap: 'rgba(255, 0, 0, 0.5)'
    },
    // シャフト径（パターン2）用の色
    pattern2: {
        normal: 'rgba(128, 192, 255, 0.5)',
        circleOverlap: 'rgba(255, 192, 128, 0.5)',
        parentOverlap: 'rgba(255, 128, 128, 0.5)'
    }
};

// ダブルクリックによるパターン切り替え処理
function handleDoubleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    childCircles.forEach((circle) => {
        const dx = x - circle.x;
        const dy = y - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= (circle.activeSize * SCALE_FACTOR) / 2) {
            // パターンを切り替え
            circle.pattern = circle.pattern === 'pattern1' ? 'pattern2' : 'pattern1';
            circle.activeSize = circle.pattern === 'pattern1' ? circle.最大外径 : circle.シャフト径;
            
            // 切り替え時のフィードバック
            const feedbackText = circle.pattern === 'pattern1' ? '最大外径' : 'シャフト径';
            showFeedback(circle.x, circle.y, feedbackText);
            
            // 重なりチェックと再描画
            checkOverlap();
            draw();
        }
    });
}

// フィードバック表示用の関数
function showFeedback(x, y, text) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y - 20);
    setTimeout(() => {
        draw();
    }, 1000);
    ctx.restore();
}


// 初期化関数
function init() {
    canvas = document.getElementById('circleCanvas');
    ctx = canvas.getContext('2d');
    
    // キャンバスのイベントリスナー設定
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('dblclick', handleDoubleClick);
    
    loadExcelData();
}

// Excelデータの読み込み
async function loadExcelData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        processCircleData(data);
    } catch (error) {
        console.error('データ読み込みエラー:', error);
    }
}

// データの処理
function processCircleData(data) {
    const parentCircles = data.filter(item => item['判断円'] === '親円');
    const childCirclesData = data.filter(item => item['判断円'] === '子円');
    createSelectBoxes(parentCircles, childCirclesData);
}

// UIの作成
function createSelectBoxes(parentCircles, childCirclesData) {
    const controls = document.getElementById('controls');
    controls.innerHTML = `
        <div class="select-group">
            <label>親円の選択:</label>
            <select id="parentSelect">
                <option value="">選択してください</option>
                ${parentCircles.map(circle => 
                    `<option value="${circle.名称}">${circle.タイプ} - ${circle.名称} (${circle.最大外径}mm)</option>`
                ).join('')}
            </select>
        </div>
        <div class="select-group">
            <label>タイプの選択:</label>
            <select id="typeSelect">
                <option value="">選択してください</option>
                ${[...new Set(childCirclesData.map(circle => circle.タイプ))].map(type =>
                    `<option value="${type}">${type}</option>`
                ).join('')}
            </select>
        </div>
        <div class="select-group">
            <label>名称の選択:</label>
            <select id="nameSelect" disabled>
                <option value="">選択してください</option>
            </select>
        </div>
        <div class="select-group">
            <label>直径パターン:</label>
            <select id="patternSelect" disabled>
                <option value="pattern1">最大外径</option>
                <option value="pattern2">シャフト径</option>
            </select>
        </div>
        <button id="addCircle" disabled>円を追加</button>
    `;

    setupEventListeners(parentCircles, childCirclesData);
}


// イベントリスナーの設定
function setupEventListeners(parentCircles, childCirclesData) {
    const parentSelect = document.getElementById('parentSelect');
    const typeSelect = document.getElementById('typeSelect');
    const nameSelect = document.getElementById('nameSelect');
    const patternSelect = document.getElementById('patternSelect');
    const addButton = document.getElementById('addCircle');

    parentSelect.addEventListener('change', (e) => {
        const selected = parentCircles.find(circle => circle.名称 === e.target.value);
        parentCircle = selected;
        draw();
    });

    typeSelect.addEventListener('change', (e) => {
        const selectedType = e.target.value;
        const filteredCircles = childCirclesData.filter(circle => circle.タイプ === selectedType);
        
        nameSelect.innerHTML = `
            <option value="">選択してください</option>
            ${filteredCircles.map(circle =>
                `<option value="${circle.名称}">${circle.名称} (最大外径:${circle.最大外径}mm, シャフト径:${circle.シャフト径}mm)</option>`
            ).join('')}
        `;
        nameSelect.disabled = false;
        patternSelect.disabled = true;
        addButton.disabled = true;
    });

    nameSelect.addEventListener('change', (e) => {
        const selectedName = e.target.value;
        selectedChildCircle = childCirclesData.find(
            circle => circle.名称 === selectedName && circle.タイプ === typeSelect.value
        );
        patternSelect.disabled = !selectedName;
        addButton.disabled = !selectedName;
    });

    patternSelect.addEventListener('change', () => {
        addButton.disabled = !selectedChildCircle;
    });

    addButton.addEventListener('click', () => {
        if (!parentCircle || !selectedChildCircle) return;

        const pattern = patternSelect.value;
        const diameter = pattern === 'pattern1' ? selectedChildCircle.最大外径 : selectedChildCircle.シャフト径;

        const newCircle = {
            ...selectedChildCircle,
            x: canvas.width / 2,
            y: canvas.height / 2,
            isOverlapping: false,
            pattern: pattern,
            activeSize: diameter
        };
        
        childCircles.push(newCircle);
        checkOverlap();
        draw();
    });
}


// マウスイベントハンドラー
function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    childCircles.forEach((circle, index) => {
        const dx = x - circle.x;
        const dy = y - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= (circle.activeSize * SCALE_FACTOR) / 2) {
            draggedCircle = index;
        }
    });
}

function handleMouseMove(e) {
    if (draggedCircle === null) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    childCircles[draggedCircle].x = x;
    childCircles[draggedCircle].y = y;
    checkOverlap();
    draw();
}

function handleMouseUp() {
    draggedCircle = null;
}

// 重なりチェック
function checkOverlap() {
    if (!parentCircle) return;

    childCircles.forEach((circle, i) => {
        const hasCircleOverlap = childCircles.some((other, j) => {
            if (i === j) return false;
            const dx = circle.x - other.x;
            const dy = circle.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = ((circle.activeSize + other.activeSize) * SCALE_FACTOR) / 2;
            return distance < minDistance;
        });

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const dx = circle.x - centerX;
        const dy = circle.y - centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = (parentCircle.最大外径 * SCALE_FACTOR) / 2 - (circle.activeSize * SCALE_FACTOR) / 2;
        const isOutsideParent = distanceFromCenter > maxDistance;

        circle.isOutsideParent = isOutsideParent;
        circle.hasCircleOverlap = hasCircleOverlap;
        circle.isOverlapping = hasCircleOverlap || isOutsideParent;
    });
}


// 描画関数
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 親円の描画
    if (parentCircle) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = (parentCircle.最大外径 * SCALE_FACTOR) / 2;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#000';
        ctx.stroke();
    }
    
    // 子円の描画
    childCircles.forEach(circle => {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, (circle.activeSize * SCALE_FACTOR) / 2, 0, Math.PI * 2);
        
        if (circle.isOutsideParent) {
            ctx.fillStyle = CIRCLE_COLORS[circle.pattern].parentOverlap;
        } else if (circle.hasCircleOverlap) {
            ctx.fillStyle = CIRCLE_COLORS[circle.pattern].circleOverlap;
        } else {
            ctx.fillStyle = CIRCLE_COLORS[circle.pattern].normal;
        }
        
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.stroke();

        // 円の情報表示
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        const displayText = `${circle.名称} (${circle.activeSize}mm)`;
        ctx.fillText(displayText, circle.x - 30, circle.y - ((circle.activeSize * SCALE_FACTOR) / 2 + 5));
    });

    updateStatus();
    updateCircleList();
}

// 状態表示の更新
function updateStatus() {
    const statusDiv = document.getElementById('status');
    const hasOverlap = childCircles.some(circle => circle.hasCircleOverlap);
    const hasOutside = childCircles.some(circle => circle.isOutsideParent);
    
    let statusHTML = '';
    let statusClass = '';
    
    if (hasOverlap || hasOutside) {
        statusClass = 'error';
        if (hasOverlap) statusHTML += '⚠️ 子円同士が重なっています。<br>';
        if (hasOutside) statusHTML += '⚠️ 親円からはみ出ている円があります。<br>';
    } else if (childCircles.length > 0) {
        statusClass = 'success';
        statusHTML = '✅ 全ての円が正常に配置されています。';
    }
    
    statusDiv.className = `status ${statusClass}`;
    statusDiv.innerHTML = statusHTML;
}

// 円リストの更新
function updateCircleList() {
    const circleItems = document.getElementById('circleItems');
    circleItems.innerHTML = childCircles.map((circle, index) => `
        <div class="circle-item ${circle.isOverlapping ? 'warning' : ''}" style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: top;">
                <div style="flex-grow: 1;">
                    <div>${circle.タイプ} - ${circle.名称} (${circle.activeSize}mm)
                        <span class="pattern-indicator ${circle.pattern}">
                            ${circle.pattern === 'pattern1' ? '最大外径' : 'シャフト径'}
                        </span>
                        ${circle.isOutsideParent ? ' - はみ出し' : ''}
                        ${circle.hasCircleOverlap ? ' - 重なり' : ''}
                    </div>
                    <div class="note-area">
                        <textarea 
                            id="note-${index}"
                            placeholder="備考を入力"
                        >${circle.備考 || ''}</textarea>
                        <button onclick="saveNote(${index})" class="save-btn">
                            保存
                        </button>
                    </div>
                </div>
                <button onclick="removeCircle(${index})" class="delete-btn">削除</button>
            </div>
        </div>
    `).join('');
}

// 円の削除
function removeCircle(index) {
    childCircles.splice(index, 1);
    checkOverlap();
    draw();
}

// 備考の保存
function saveNote(index) {
    const noteText = document.getElementById(`note-${index}`).value;
    childCircles[index].備考 = noteText;
    
    fetch('/api/save-note', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            circleData: childCircles[index],
            note: noteText
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('備考を保存しました');
        } else {
            alert('保存に失敗しました');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('保存中にエラーが発生しました');
    });
}

// グローバル関数として公開
window.removeCircle = removeCircle;
window.saveNote = saveNote;

// アプリケーションの起動
document.addEventListener('DOMContentLoaded', init);


