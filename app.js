


// 数据存储键
const STORAGE_KEY = 'work_tracker_data';

// 应用状态
let records = [];
let currentMonth = new Date();
let currentStatus = null;
let currentOvertime = null;

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadData();
    initEventListeners();
    updateUI();
    registerServiceWorker();
});

// 加载数据
function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        records = JSON.parse(stored);
    }
}

// 保存数据
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// 初始化事件监听
function initEventListeners() {
    // 工作状态按钮
    document.getElementById('workBtn').addEventListener('click', () => selectStatus('work'));
    document.getElementById('restBtn').addEventListener('click', () => selectStatus('rest'));

    // 加班按钮
    document.getElementById('noOvertimeBtn').addEventListener('click', () => selectOvertime('no'));
    document.getElementById('yesOvertimeBtn').addEventListener('click', () => selectOvertime('yes'));

    // 提交按钮
    document.getElementById('submitBtn').addEventListener('click', submitRecord);

    // 导出按钮
    document.getElementById('exportBtn').addEventListener('click', exportData);

    // 主题切换按钮
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // 日历导航
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
}

// 切换主题
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// 选择工作状态
function selectStatus(status) {
    currentStatus = status;

    // 更新按钮状态
    document.querySelectorAll('[data-status]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });

    // 显示/隐藏加班选项
    const overtimeGroup = document.getElementById('overtimeGroup');
    if (status === 'work') {
        overtimeGroup.style.display = 'block';
        // 功能3：默认不加班
        currentOvertime = 'no';
        document.querySelectorAll('[data-overtime]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.overtime === 'no');
        });
    } else {
        overtimeGroup.style.display = 'none';
        currentOvertime = null;
        document.querySelectorAll('[data-overtime]').forEach(btn => btn.classList.remove('active'));
        document.getElementById('timeGroup').style.display = 'none';
    }

    updateSubmitButton();
}

// 选择加班状态
function selectOvertime(overtime) {
    currentOvertime = overtime;

    // 更新按钮状态
    document.querySelectorAll('[data-overtime]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.overtime === overtime);
    });

    // 显示/隐藏时间选择
    const timeGroup = document.getElementById('timeGroup');
    if (overtime === 'yes') {
        timeGroup.style.display = 'block';
    } else {
        timeGroup.style.display = 'none';
    }

    updateSubmitButton();
}

// 更新提交按钮状态
function updateSubmitButton() {
    const submitBtn = document.getElementById('submitBtn');

    // 功能3：选择状态后就可以提交（默认不加班）
    if (currentStatus) {
        submitBtn.disabled = false;
    } else {
        submitBtn.disabled = true;
    }
}

// 提交记录
function submitRecord() {
    const today = new Date();
    const dateStr = formatDate(today);

    // 检查今天是否已有记录
    const existingIndex = records.findIndex(r => r.date === dateStr);

    const record = {
        date: dateStr,
        status: currentStatus,
        overtime: currentOvertime === 'yes',
        overtimeEnd: currentOvertime === 'yes' ? document.getElementById('overtimeEnd').value : null,
        timestamp: Date.now()
    };

    if (existingIndex >= 0) {
        records[existingIndex] = record;
    } else {
        records.unshift(record);
    }

    saveData();
    updateUI();
    showTodayStatus(record);

    // 重置表单
    resetForm();
}

// 重置表单
function resetForm() {
    currentStatus = null;
    currentOvertime = null;

    document.querySelectorAll('[data-status]').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('[data-overtime]').forEach(btn => btn.classList.remove('active'));
    document.getElementById('overtimeGroup').style.display = 'none';
    document.getElementById('timeGroup').style.display = 'none';
    document.getElementById('submitBtn').disabled = true;
}

// 显示今日状态
function showTodayStatus(record) {
    const statusDiv = document.getElementById('todayStatus');
    let message = `今日已打卡：${record.status === 'work' ? '上班' : '休息'}`;

    if (record.overtime) {
        message += `，加班至 ${record.overtimeEnd}`;
    }

    statusDiv.textContent = message;
    statusDiv.classList.add('show');
}

// 更新UI
function updateUI() {
    updateTodayDate();
    updateStats();
    updateCalendar();
    updateRecordsList();
    checkTodayRecord();
}

// 更新今日日期
function updateTodayDate() {
    const today = new Date();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 ${weekdays[today.getDay()]}`;
    document.getElementById('todayDate').textContent = dateStr;
}

// 检查今日记录
function checkTodayRecord() {
    const today = formatDate(new Date());
    const todayRecord = records.find(r => r.date === today);

    if (todayRecord) {
        showTodayStatus(todayRecord);
    }
}

// 更新统计
function updateStats() {
    // 使用currentMonth变量，这样统计会跟随日历月份变化
    const monthRecords = records.filter(r => {
        const recordDate = new Date(r.date);
        return recordDate.getMonth() === currentMonth.getMonth() &&
            recordDate.getFullYear() === currentMonth.getFullYear();
    });

    // 工作天数
    const workDays = monthRecords.filter(r => r.status === 'work').length;
    document.getElementById('workDays').textContent = workDays;

    // 加班天数
    const overtimeDays = monthRecords.filter(r => r.overtime).length;
    document.getElementById('overtimeDays').textContent = overtimeDays;

    // 计算加班时长
    let totalOvertimeHours = 0;
    monthRecords.forEach(r => {
        if (r.overtime && r.overtimeEnd) {
            const [hours, minutes] = r.overtimeEnd.split(':').map(Number);
            const overtimeHours = hours - 18 + minutes / 60; // 假设下班时间是18:00
            if (overtimeHours > 0) {
                totalOvertimeHours += overtimeHours;
            }
        }
    });

    // 平均加班时长
    const avgOvertime = overtimeDays > 0 ? (totalOvertimeHours / overtimeDays).toFixed(1) : '0';
    document.getElementById('avgOvertime').textContent = `${avgOvertime}h`;

    // 总加班时长
    document.getElementById('totalOvertime').textContent = `${totalOvertimeHours.toFixed(1)}h`;

    // 更新统计卡片标题，显示当前查看的是哪个月份
    updateStatsTitle();
}

// 更新统计卡片标题
function updateStatsTitle() {
    const now = new Date();
    const isCurrentMonth = currentMonth.getMonth() === now.getMonth() &&
        currentMonth.getFullYear() === now.getFullYear();

    const statsTitle = document.querySelector('.stats-card .card-title');
    if (isCurrentMonth) {
        statsTitle.textContent = '本月统计';
    } else {
        statsTitle.textContent = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月统计`;
    }
}

// 更新日历
function updateCalendar() {
    const calendar = document.getElementById('calendar');
    const title = document.getElementById('calendarTitle');

    // 更新标题
    title.textContent = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;

    // 清空日历
    calendar.innerHTML = '';

    // 添加星期标题
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    weekdays.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day header';
        dayEl.textContent = day;
        calendar.appendChild(dayEl);
    });

    // 获取月份第一天和最后一天
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    // 获取第一天是星期几
    const firstDayOfWeek = firstDay.getDay();

    // 添加上月的日期
    const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay.getDate() - i;
        const dayEl = createCalendarDay(day, true);
        calendar.appendChild(dayEl);
    }

    // 添加当月的日期
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dayEl = createCalendarDay(day, false, date);
        calendar.appendChild(dayEl);
    }

    // 添加下月的日期
    const remainingDays = 42 - calendar.children.length + 7; // 7是星期标题
    for (let day = 1; day <= remainingDays; day++) {
        const dayEl = createCalendarDay(day, true);
        calendar.appendChild(dayEl);
    }
}

// 创建日历日期元素
function createCalendarDay(day, otherMonth, date = null) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';

    if (otherMonth) {
        dayEl.classList.add('other-month');
    }

    const numberEl = document.createElement('div');
    numberEl.className = 'calendar-day-number';
    numberEl.textContent = day;
    dayEl.appendChild(numberEl);

    if (date) {
        const dateStr = formatDate(date);
        const record = records.find(r => r.date === dateStr);

        // 检查是否是今天
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            dayEl.classList.add('today');
        }

        // 功能2：添加点击事件编辑历史记录
        dayEl.style.cursor = 'pointer';
        dayEl.addEventListener('click', () => editRecord(dateStr, record));

        if (record) {
            if (record.overtime) {
                dayEl.classList.add('overtime');
                const infoEl = document.createElement('div');
                infoEl.className = 'calendar-day-info';
                infoEl.textContent = '加班';
                dayEl.appendChild(infoEl);
            } else if (record.status === 'work') {
                dayEl.classList.add('work');
                const infoEl = document.createElement('div');
                infoEl.className = 'calendar-day-info';
                infoEl.textContent = '上班';
                dayEl.appendChild(infoEl);
            } else {
                dayEl.classList.add('rest');
            }
        } else {
            // 功能 1：没有记录默认显示为休息
            const isPast = date < today && date.toDateString() !== today.toDateString();
            if (isPast) {
                dayEl.classList.add('rest');
            }
        }
    }

    return dayEl;
}

// 更新记录列表
function updateRecordsList() {
    const list = document.getElementById('recordsList');
    list.innerHTML = '';

    if (records.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <p>还没有记录哦，快去打卡吧！</p>
            </div>
        `;
        return;
    }

    // 显示最近10条记录
    records.slice(0, 10).forEach(record => {
        const item = document.createElement('div');
        item.className = 'record-item';

        const dateEl = document.createElement('div');
        dateEl.className = 'record-date';
        dateEl.textContent = formatDisplayDate(record.date);

        const infoEl = document.createElement('div');
        infoEl.className = 'record-info';

        const badge = document.createElement('span');
        badge.className = `record-badge ${record.overtime ? 'overtime' : record.status}`;
        badge.textContent = record.overtime ? '加班' : (record.status === 'work' ? '上班' : '休息');

        infoEl.appendChild(badge);

        if (record.overtime && record.overtimeEnd) {
            const timeEl = document.createElement('span');
            timeEl.className = 'record-time';
            timeEl.textContent = `至 ${record.overtimeEnd}`;
            infoEl.appendChild(timeEl);
        }

        item.appendChild(dateEl);
        item.appendChild(infoEl);
        list.appendChild(item);
    });
}

// 切换月份
function changeMonth(delta) {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
    updateCalendar();
    updateStats();
}

// 导出数据
function exportData() {
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `work-tracker-${formatDate(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('数据导出成功！');
}

// 格式化日期
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 格式化显示日期
function formatDisplayDate(dateStr) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 ${weekday}`;
}

// 编辑历史记录（功能2）
function editRecord(dateStr, existingRecord) {
    const date = new Date(dateStr);
    const displayDate = formatDisplayDate(dateStr);

    const status = existingRecord ? existingRecord.status : 'rest';
    const overtime = existingRecord ? existingRecord.overtime : false;
    const overtimeEnd = existingRecord && existingRecord.overtimeEnd ? existingRecord.overtimeEnd : '21:00';

    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    dialog.innerHTML = `
        <div class="dialog-overlay" onclick="this.parentElement.remove()"></div>
        <div class="dialog-content">
            <h3>编辑打卡记录</h3>
            <p class="dialog-date">${displayDate}</p>
            
            <div class="dialog-group">
                <label>工作状态</label>
                <div class="button-group">
                    <button class="btn btn-option ${status === 'work' ? 'active' : ''}" data-status="work">上班</button>
                    <button class="btn btn-option ${status === 'rest' ? 'active' : ''}" data-status="rest">休息</button>
                </div>
            </div>
            
            <div class="dialog-group" id="dialogOvertimeGroup" style="display: ${status === 'work' ? 'block' : 'none'}">
                <label>是否加班</label>
                <div class="button-group">
                    <button class="btn btn-option ${!overtime ? 'active' : ''}" data-overtime="no">不加班</button>
                    <button class="btn btn-option ${overtime ? 'active' : ''}" data-overtime="yes">加班</button>
                </div>
            </div>
            
            <div class="dialog-group" id="dialogTimeGroup" style="display: ${overtime ? 'block' : 'none'}">
                <label>加班结束时间</label>
                <input type="time" class="time-input" id="dialogOvertimeEnd" value="${overtimeEnd}">
            </div>
            
            <div class="dialog-actions">
                <button class="btn btn-secondary" onclick="this.closest('.edit-dialog').remove()">取消</button>
                <button class="btn btn-primary" id="dialogSaveBtn">保存</button>
                ${existingRecord ? '<button class="btn btn-danger" id="dialogDeleteBtn">删除</button>' : ''}
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    let dialogStatus = status;
    let dialogOvertime = overtime;

    // 状态按钮事件
    dialog.querySelectorAll('[data-status]').forEach(btn => {
        btn.addEventListener('click', function () {
            dialogStatus = this.dataset.status;
            dialog.querySelectorAll('[data-status]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const overtimeGroup = dialog.querySelector('#dialogOvertimeGroup');
            if (dialogStatus === 'work') {
                overtimeGroup.style.display = 'block';
                dialogOvertime = false;
                dialog.querySelectorAll('[data-overtime]').forEach(b => {
                    b.classList.toggle('active', b.dataset.overtime === 'no');
                });
                dialog.querySelector('#dialogTimeGroup').style.display = 'none';
            } else {
                overtimeGroup.style.display = 'none';
                dialog.querySelector('#dialogTimeGroup').style.display = 'none';
            }
        });
    });

    // 加班按钮事件
    dialog.querySelectorAll('[data-overtime]').forEach(btn => {
        btn.addEventListener('click', function () {
            dialogOvertime = this.dataset.overtime === 'yes';
            dialog.querySelectorAll('[data-overtime]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const timeGroup = dialog.querySelector('#dialogTimeGroup');
            timeGroup.style.display = dialogOvertime ? 'block' : 'none';
        });
    });

    // 保存按钮
    dialog.querySelector('#dialogSaveBtn').addEventListener('click', () => {
        const record = {
            date: dateStr,
            status: dialogStatus,
            overtime: dialogOvertime,
            overtimeEnd: dialogOvertime ? dialog.querySelector('#dialogOvertimeEnd').value : null,
            timestamp: Date.now()
        };

        const existingIndex = records.findIndex(r => r.date === dateStr);
        if (existingIndex >= 0) {
            records[existingIndex] = record;
        } else {
            records.unshift(record);
        }

        saveData();
        updateUI();
        dialog.remove();
    });

    // 删除按钮
    const deleteBtn = dialog.querySelector('#dialogDeleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (confirm('确定要删除这条记录吗？')) {
                const index = records.findIndex(r => r.date === dateStr);
                if (index >= 0) {
                    records.splice(index, 1);
                    saveData();
                    updateUI();
                }
                dialog.remove();
            }
        });
    }
}

// 注册Service Worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('./service-worker.js');
            console.log('Service Worker registered successfully');
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    }
}
