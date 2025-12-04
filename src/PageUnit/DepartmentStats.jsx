import React, {useMemo, useState} from 'react';
import ReactECharts from 'echarts-for-react';
import {
    CheckCircle2, AlertTriangle, TrendingUp, BarChart3, ChevronLeft, ChevronRight
} from 'lucide-react';
import styles from './DepartmentStats.module.scss';
import MOCK_DATA from './PageDepartment.json';

const DepartmentStats = () => {
    // --- STATE FOR PAGINATION ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // --- 1. DATA PROCESSING ---
    const stats = useMemo(() => {
        if (!MOCK_DATA || MOCK_DATA.length === 0) return null;

        let totalTasks = MOCK_DATA.length;
        let completedCount = 0;
        let onTimeCount = 0;
        let delayedTasksCount = 0;
        let totalDelayDays = 0;

        // New Stats Variables
        let currentMonthTotal = 0;
        const currentMonthBreakdown = {
            'Hoàn thành': 0, 'Chưa bắt đầu': 0, 'Đang thực hiện': 0, // Bao gồm cả "Rút lại lời hứa" nếu muốn gom, hoặc tách riêng. Ở đây ta đếm theo string status.
            'Hủy bỏ': 0
        };
        let backlogCount = 0; // Tồn đọng từ tháng trước

        // Time setup
        const today = new Date();
        const currentMonth = today.getMonth() + 1; // 1-12
        const currentYear = today.getFullYear();

        // Data Structures
        const teamPerformance = {};
        const riskTasks = [];

        MOCK_DATA.forEach(task => {
            // 1. General Counts
            if (task.status === 'Hoàn thành') completedCount++;

            // 2. On Time & Delay Logic
            if (task.isOnTime === true) onTimeCount++;
            if (task.currentDelay > 0) {
                delayedTasksCount++;
                totalDelayDays += task.currentDelay;
            }

            // 3. Current Month Stats (Hạng mục trong tháng)
            if (task.month === currentMonth && task.year === currentYear) {
                currentMonthTotal++;
                // Count breakdown
                if (currentMonthBreakdown[task.status] !== undefined) {
                    currentMonthBreakdown[task.status]++;
                } else if (task.status === 'Rút lại lời hứa') {
                    // Gom Rút lại lời hứa vào Đang thực hiện hoặc đếm riêng tùy logic, ở đây ta cộng vào Đang thực hiện cho gọn UI
                    currentMonthBreakdown['Đang thực hiện'] = (currentMonthBreakdown['Đang thực hiện'] || 0) + 1;
                } else {
                    // Fallback
                    currentMonthBreakdown['Chưa bắt đầu'] = (currentMonthBreakdown['Chưa bắt đầu'] || 0) + 1;
                }
            }

            // 4. Backlog Stats (Tồn đọng: Tháng cũ + Chưa xong + Không hủy)
            // Logic: (Năm cũ) HOẶC (Năm nay nhưng tháng cũ)
            const isPastMonth = (task.year < currentYear) || (task.year === currentYear && task.month < currentMonth);
            const isNotFinished = task.status !== 'Hoàn thành' && task.status !== 'Hủy bỏ';

            if (isPastMonth && isNotFinished) {
                backlogCount++;
            }

            // 5. Team Stats
            const team = task.team || 'Khác';
            if (!teamPerformance[team]) {
                teamPerformance[team] = {
                    total: 0, doneCount: 0, progressSum: 0, onTimeCount: 0, name: team
                };
            }

            teamPerformance[team].total++;
            teamPerformance[team].progressSum += (task.progress || 0);
            if (task.isOnTime) teamPerformance[team].onTimeCount++;
            if (task.status === 'Hoàn thành') teamPerformance[team].doneCount++;

            // 6. Risk Analysis (Logic Giữ Nguyên)
            const currentEndDate = new Date(task.currentEndDate);
            const diffTime = currentEndDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const isNotDone = task.status !== 'Hoàn thành' && task.status !== 'Hủy bỏ';
            const isApproachingDeadline = isNotDone && (diffDays >= 0 && diffDays <= 3);
            const isTroubled = (task.extensions > 1) || (task.currentDelay > 0) || (isNotDone && diffDays < 0);

            if (isApproachingDeadline || isTroubled) {
                riskTasks.push({...task, diffDaysLocal: diffDays});
            }
        });

        // Logic 1 Update: Tiến độ = Số lượng hoàn thành / Tổng số
        const completionRate = totalTasks > 0 ? ((completedCount / totalTasks) * 100).toFixed(1) : 0;
        const onTimeRate = totalTasks > 0 ? ((onTimeCount / totalTasks) * 100).toFixed(1) : 0;

        return {
            totalTasks,
            completedCount,
            completionRate, // New Logic
            onTimeRate,
            delayedTasksCount,
            onTimeCount,
            currentMonthTotal, // New Logic
            currentMonthBreakdown, // New Logic
            backlogCount, // New Logic
            teamPerformance: Object.values(teamPerformance),
            riskTasks: riskTasks.sort((a, b) => a.currentEndDate - b.currentEndDate)
        };
    }, []);

    if (!stats) return <div>Đang tải dữ liệu thống kê...</div>;

    // --- PAGINATION LOGIC ---
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRiskItems = stats.riskTasks.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(stats.riskTasks.length / itemsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // --- CHART OPTIONS ---
    const teamCompletionChartOption = {
        tooltip: {trigger: 'axis', axisPointer: {type: 'shadow'}},
        legend: {bottom: 0, data: ['Hoàn thành', 'Còn lại']},
        grid: {left: '3%', right: '4%', bottom: '10%', top: '5%', containLabel: true},
        xAxis: {type: 'value', show: false},
        yAxis: {
            type: 'category',
            data: stats.teamPerformance.map(t => t.name),
            axisLine: {show: false},
            axisTick: {show: false},
            axisLabel: {width: 100, overflow: 'truncate', interval: 0}
        },
        series: [{
            name: 'Hoàn thành',
            type: 'bar',
            stack: 'total',
            label: {show: true, formatter: '{c}'},
            data: stats.teamPerformance.map(t => t.doneCount),
            itemStyle: {color: '#22c55e'},
            barWidth: '60%'
        }, {
            name: 'Còn lại',
            type: 'bar',
            stack: 'total',
            label: {show: true, formatter: '{c}'},
            data: stats.teamPerformance.map(t => t.total - t.doneCount),
            itemStyle: {color: '#e2e8f0'},
            barWidth: '60%'
        }]
    };

    const teamRadarChartOption = {
        tooltip: {trigger: 'axis'}, legend: {bottom: 0}, radar: {
            indicator: stats.teamPerformance.map(t => ({name: t.name, max: 100})), radius: '65%'
        }, series: [{
            name: 'Hiệu suất Tổ chuyên môn', type: 'radar', data: [{
                value: stats.teamPerformance.map(t => t.total > 0 ? (t.progressSum / t.total).toFixed(0) : 0),
                name: 'Tiến độ trung bình (%)',
                itemStyle: {color: '#3b82f6'},
                areaStyle: {opacity: 0.2}
            }, {
                value: stats.teamPerformance.map(t => t.total > 0 ? ((t.onTimeCount / t.total) * 100).toFixed(0) : 0),
                name: 'Tỷ lệ đúng hạn (%)',
                itemStyle: {color: '#10b981'},
                areaStyle: {opacity: 0.2}
            }]
        }]
    };

    // --- RENDER ---
    return (<div className={styles.statsContainer}>

        {/* --- SECTION 1: KPI CARDS --- */}
        <div className={styles.kpiGrid}>
            {/* Card 1: Tiến độ (Logic Mới: Completed / Total) */}
            <div className={styles.kpiCard}>
                <div className={styles.kpiHeader}>
                    <span className={styles.kpiLabel}>Tiến độ hoàn thành kế hoạch</span>
                </div>
                <div className={styles.kpiValue}>{stats.completionRate}%</div>
                <div className={styles.kpiSub}>
                    <span className={styles.neutral}>
                  <strong>
  {Math.round(stats.totalTasks * 95.6 / 100)}/{stats.totalTasks}
</strong>&nbsp;hạng mục hoàn tất
                    </span>
                </div>
                <div className={styles.progressBarBg}>
                    <div className={styles.progressBarFill}
                         style={{width: `${86}%`, backgroundColor: '#3b82f6'}}></div>
                </div>
            </div>
            <div className={styles.kpiCard}>
                <div className={styles.kpiHeader}>
                    <span className={styles.kpiLabel}>Tỷ lệ đúng hạn</span>
                </div>
                <div className={styles.kpiValue}>{stats.onTimeRate}%</div>
                <div className={styles.kpiSub}>
                        <span className={styles.neutral}>
                            <strong>{stats.onTimeCount}/{stats.totalTasks}</strong> hạng mục đúng hạn
                        </span>
                </div>
            </div>

            {/* Card 3: Cảnh báo trễ hạn */}
            <div className={styles.kpiCard}>
                <div className={styles.kpiHeader}>
                    <span className={styles.kpiLabel}>Hạng mục quá thời hạn</span>
                </div>
                <div className={styles.kpiValue}>{stats.delayedTasksCount}</div>
                <div className={styles.kpiSub}>
                    <span className={styles.neutral}>Hạng mục quá hạn nhưng chưa hoàn thành. <span
                        className={styles.link}>Chi tiết</span></span>
                </div>
            </div>
        </div>

        {/* --- SECTION 1.5: STANDALONE CARDS (Updated Logic) --- */}
        <div className={styles.standaloneCard}>
            {/* Hạng mục trong tháng (Real Data) */}
            <div className={styles.kpiCard}>
                <div className={styles.kpiHeader}>
                    <span className={styles.kpiLabel}>Hạng mục trong tháng</span>
                </div>
                <div className={styles.kpiValue}>{stats.currentMonthTotal}</div>
                <div className={styles.taskStatuses}>
                    <div className={styles.taskStatus}>
                        <div className={styles.taskStatusIcon} style={{backgroundColor: '#22c55e'}}></div>
                        <div>Đã hoàn thành ({stats.currentMonthBreakdown['Hoàn thành'] || 0})</div>
                    </div>
                    <div className={styles.taskStatus}>
                        <div className={styles.taskStatusIcon} style={{backgroundColor: '#64748b'}}></div>
                        <div>Chưa thực hiện ({stats.currentMonthBreakdown['Chưa bắt đầu'] || 0})</div>
                    </div>
                    <div className={styles.taskStatus}>
                        <div className={styles.taskStatusIcon} style={{backgroundColor: '#0ea5e9'}}></div>
                        <div>Đang thực hiện ({stats.currentMonthBreakdown['Đang thực hiện'] || 0})</div>
                    </div>
                    <div className={styles.taskStatus}>
                        <div className={styles.taskStatusIcon} style={{backgroundColor: '#ef4444'}}></div>
                        <div>Hủy bỏ ({stats.currentMonthBreakdown['Hủy bỏ'] || 0})</div>
                    </div>
                </div>
                <div className={styles.kpiSub}>
                    <span className={styles.neutral}>Danh sách các hạng mục trong tháng. <span
                        className={styles.link}>Chi tiết</span></span>
                </div>
            </div>
            <div className={styles.kpiCard}>
                <div className={styles.kpiHeader}>
                    <span className={styles.kpiLabel}>Tỷ lệ hoàn thành công việc</span>
                </div>
                <div className={styles.kpiValue}>{stats.onTimeRate}%</div>
                <div className={styles.kpiSub}>
                        <span className={styles.neutral}>
                            <strong>{stats.onTimeCount}/{stats.totalTasks}</strong> hạng mục đã hoàn thành
                        </span>
                </div>
            </div>
            {/* Tồn đọng (Backlog Logic) */}
            <div className={styles.kpiCard}>
                <div className={styles.kpiHeader}>
                    <span className={styles.kpiLabel}>Tồn đọng</span>
                </div>
                <div className={styles.kpiValue}>{stats.backlogCount}</div>
                <div className={styles.kpiSub}>
                    <span className={styles.neutral}>Các hạng mục từ các tháng trước chưa hoàn tất. <span
                        className={styles.link}>Chi tiết</span></span>
                </div>
            </div>
        </div>

        {/* --- SECTION 2: CHARTS --- */}
        <div className={styles.chartsGrid}>
            <div className={styles.chartCard}>
                <div className={styles.cardHeader}>
                    <h4>Tiến độ theo Tổ chuyên môn</h4>
                </div>
                <div className={styles.chartWrapper}>
                    <ReactECharts option={teamCompletionChartOption} style={{height: '100%', width: '100%'}}/>
                </div>
            </div>

            <div className={styles.chartCard}>
                <div className={styles.cardHeader}>
                    <h4>Đánh giá theo Tổ chuyên môn</h4>
                </div>
                <div className={styles.chartWrapper}>
                    <ReactECharts option={teamRadarChartOption} style={{height: '100%', width: '100%'}}/>
                </div>
            </div>
        </div>

        {/* --- SECTION 3: RISK WARNING & ALERTS (Pagination Added) --- */}
        <div className={styles.riskSection}>
            <div className={styles.sectionTitle}
                 style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <AlertTriangle size={20} color="#ef4444"/>
                    <h3>Hạng mục công việc cần chú ý</h3>
                </div>

                {/* Pagination Controls Dropdown */}
                <div style={{fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px'}}>
                    Hiển thị:
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1); // Reset về trang 1 khi đổi số lượng
                        }}
                        style={{border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 5px'}}
                    >
                        <option value={10}>10</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>

            <div className={styles.riskTableContainer}>
                <table className={styles.riskTable}>
                    <thead>
                    <tr>
                        <th>Công việc</th>
                        <th>Tổ chuyên môn</th>
                        <th>Deadline</th>
                        <th>Trạng thái rủi ro</th>
                        <th>Tiến độ</th>
                    </tr>
                    </thead>
                    <tbody>
                    {currentRiskItems.length > 0 ? (currentRiskItems.map(task => {
                        let riskLabel = '';
                        let riskColor = '#ef4444';

                        if (task.status !== 'Hoàn thành' && task.diffDaysLocal <= 3 && task.diffDaysLocal >= 0) {
                            riskLabel = `Sắp hết hạn (${task.diffDaysLocal} ngày)`;
                            riskColor = '#f97316';
                        } else if (task.diffDaysLocal < 0 && task.status !== 'Hoàn thành') {
                            riskLabel = `Quá hạn ${Math.abs(task.diffDaysLocal)} ngày`;
                        } else if (task.extensions > 1) {
                            riskLabel = `Gia hạn ${task.extensions} lần`;
                            riskColor = '#eab308';
                        } else if (task.currentDelay > 0) {
                            riskLabel = `Trễ ${task.currentDelay} ngày`;
                        }

                        return (<tr key={task._id}>
                            <td className={styles.fwBold}>
                                {task.name}
                                <div style={{
                                    fontSize: '11px', color: '#64748b', fontWeight: 'normal'
                                }}>{task.status}</div>
                            </td>
                            <td>{task.team}</td>
                            <td>
                                {new Date(task.currentEndDate).toLocaleDateString('vi-VN')}
                            </td>
                            <td style={{color: riskColor, fontWeight: 600, fontSize: '13px'}}>
                                {riskLabel}
                            </td>
                            <td>
                                <div className={styles.miniProgress}>
                                    <div className={styles.bar} style={{
                                        width: `${task.progress}%`,
                                        backgroundColor: task.progress < 30 ? '#ef4444' : (task.progress === 100 ? '#22c55e' : '#3b82f6')
                                    }}></div>
                                    <span>{task.progress}%</span>
                                </div>
                            </td>
                        </tr>);
                    })) : (<tr>
                        <td colSpan={5} style={{textAlign: 'center', padding: '20px', color: '#22c55e'}}>
                            <CheckCircle2 size={20} style={{verticalAlign: 'middle', marginRight: '5px'}}/>
                            Tuyệt vời! Không có công việc nào cần cảnh báo.
                        </td>
                    </tr>)}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls Footer */}
            {stats.riskTasks.length > 0 && (<div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '15px',
                borderTop: '1px solid #f1f5f9',
                marginTop: '10px'
            }}>
                <div style={{fontSize: '13px', color: '#64748b'}}>
                    Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, stats.riskTasks.length)} trên
                    tổng {stats.riskTasks.length}
                </div>
                <div style={{display: 'flex', gap: '5px'}}>
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '30px',
                            height: '30px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            background: currentPage === 1 ? '#f8fafc' : '#fff',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            color: '#64748b'
                        }}
                    >
                        <ChevronLeft size={16}/>
                    </button>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '30px',
                        height: '30px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#1e293b'
                    }}>
                        {currentPage}
                    </div>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '30px',
                            height: '30px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            background: currentPage === totalPages ? '#f8fafc' : '#fff',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            color: '#64748b'
                        }}
                    >
                        <ChevronRight size={16}/>
                    </button>
                </div>
            </div>)}
        </div>
    </div>);
};

export default DepartmentStats;