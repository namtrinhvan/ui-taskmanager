import React, { useState, useMemo, useEffect } from 'react';
import styles from './TaskManagement.module.scss';
import {
    FaTasks,
    FaChevronDown,
    FaChevronRight,
    FaCalendarAlt,
    FaList,
    FaStar,
    FaFilter,
    FaRegCheckCircle,
    FaHistory
} from "react-icons/fa";
import { FiActivity, FiTarget, FiCheckSquare } from "react-icons/fi";

// --- 1. MOCK DATA SOURCE (FROM IMAGE) ---
const SOURCE_TASKS = [
    "THANH TOÁN, NGHIỆM THU",
    "VẬN HÀNH XE BUS",
    "KẾ HOẠCH CÔNG VIỆC",
    "DỰ ÁN ĐỘT PHÁ",
];

// --- CONSTANTS ---
const PLAN_STATUS_CONFIG = {
    IN_PROGRESS: { label: "Đang thực hiện", color: "#3498db", bg: "#eaf2f8", icon: <FiActivity/> },
    FINISHED: { label: "Đã kết thúc", color: "#7f8c8d", bg: "#f2f3f4", icon: <FaRegCheckCircle/> },
};

const TASK_STATUS_CONFIG = {
    PENDING: { label: "Chờ xử lý", color: "#f1c40f", bg: "#fef9e7" },
    IN_PROGRESS: { label: "Đang làm", color: "#3498db", bg: "#eaf2f8" },
    COMPLETED: { label: "Hoàn thành", color: "#2ecc71", bg: "#eafaf1" },
};

// Mock 3 Plans specific naming
const MOCK_PLANS = [
    {
        id: 1,
        name: "TDS OP- VH- DVHS-KHCV NĂM 2024 - 2025",
        start: "2024-08", end: "2025-05",
        status: "IN_PROGRESS"
    },
    {
        id: 2,
        name: "TDS OP- VH- DVHS-KHCV NĂM 2023 - 2024",
        start: "2023-08", end: "2024-05",
        status: "FINISHED"
    },
    {
        id: 3,
        name: "TDS OP- VH- DVHS-KHCV NĂM 2022 - 2023",
        start: "2022-08", end: "2023-05",
        status: "FINISHED"
    },
];

// Helper: Sinh Action dựa trên tên Task (Context aware mock)
const generateActionsForTask = (taskName, isTaskParticipating) => {
    const actions = [];
    const count = Math.floor(Math.random() * 3) + 1; // 1-3 actions

    for (let i = 0; i < count; i++) {
        // Nếu Task mình tham gia, thì khả năng cao Action trong đó là của mình
        const isMyAction = isTaskParticipating ? Math.random() < 0.7 : false;

        actions.push({
            id: `act_${Math.random()}`,
            name: `Hành động cụ thể ${i+1}: ${taskName.substring(0, 20)}...`,
            executor: isMyAction ? "Tôi" : "Nguyễn Văn A",
            isMine: isMyAction,
            progress: isMyAction ? Math.floor(Math.random() * 80) : 100,
            status: ["PENDING", "IN_PROGRESS", "COMPLETED"][Math.floor(Math.random() * 3)]
        });
    }
    return actions;
};

// Helper: Sinh danh sách Task từ Source Image
const generateMockData = (plan) => {
    return SOURCE_TASKS.map((name, index) => {
        const isParticipating = Math.random() < 0.5; // 50% tỉ lệ tham gia
        return {
            id: `task_${plan.id}_${index}`,
            name: name,
            month: "2024-09", // Mock month
            status: ["PENDING", "IN_PROGRESS", "COMPLETED"][Math.floor(Math.random() * 3)],
            progress: Math.floor(Math.random() * 100),
            isParticipating: isParticipating, // Quan trọng: Cờ đánh dấu có tham gia hay không
            actions: generateActionsForTask(name, isParticipating)
        };
    });
};

// =============================================================================
// COMPONENT: TaskManagement
// =============================================================================
const TaskManagement = () => {
    const [expandedPlanId, setExpandedPlanId] = useState(MOCK_PLANS[0].id);

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <h1><FaTasks className={styles.iconHeader}/> Công việc của tôi</h1>
            </div>
            <div className={styles.planList}>
                {MOCK_PLANS.map(plan => (
                    <PlanCard
                        key={plan.id}
                        plan={plan}
                        isExpanded={expandedPlanId === plan.id}
                        onToggle={() => setExpandedPlanId(prev => prev === plan.id ? null : plan.id)}
                    />
                ))}
            </div>
        </div>
    );
};

// =============================================================================
// SUB-COMPONENT: PlanCard
// =============================================================================
const PlanCard = ({ plan, isExpanded, onToggle }) => {
    // Filter State: 'ALL' (Tất cả) hoặc 'PARTICIPATING' (Tham gia)
    const [filterCategory, setFilterCategory] = useState('ALL');

    // Data State
    const [allTasks, setAllTasks] = useState([]);

    useEffect(() => {
        // Chỉ sinh data 1 lần khi mount hoặc plan change
        setAllTasks(generateMockData(plan));
    }, [plan]);

    // Logic Lọc hiển thị
    const visibleTasks = useMemo(() => {
        if (filterCategory === 'PARTICIPATING') {
            return allTasks.filter(t => t.isParticipating);
        }
        return allTasks; // 'ALL' -> Trả về hết (nhưng sẽ highlight ở UI)
    }, [allTasks, filterCategory]);

    const planStatus = PLAN_STATUS_CONFIG[plan.status];

    return (
        <div className={`${styles.card} ${isExpanded ? styles.expanded : ''}`}>
            {/* --- CARD HEADER --- */}
            <div className={styles.cardHeader} onClick={onToggle}>
                <div className={styles.cardTitle}>
                    <FiTarget className={styles.iconPlan}/>
                    <span className={styles.planName}>{plan.name}</span>

                    {/* Status Badge thay cho Role */}
                    <span
                        className={styles.statusBadge}
                        style={{ backgroundColor: planStatus.bg, color: planStatus.color }}
                    >
                        {planStatus.icon} {planStatus.label}
                    </span>
                </div>
                <div className={styles.cardMeta}>
                    <FaCalendarAlt/> {plan.start} — {plan.end}
                    <div className={`${styles.chevron} ${isExpanded ? styles.rotate : ''}`}>
                        <FaChevronDown/>
                    </div>
                </div>
            </div>

            {/* --- CARD BODY --- */}
            {isExpanded && (
                <div className={styles.cardBody}>
                    {/* TOOLBAR */}
                    <div className={styles.toolbar}>
                        <div className={styles.filterWrapper}>
                            <label><FaFilter/> Lọc hạng mục:</label>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className={styles.dropdownFilter}
                            >
                                <option value="ALL">Tất cả (Highlight mục tham gia)</option>
                                <option value="PARTICIPATING">Chỉ mục tôi Tham gia</option>
                            </select>
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className={styles.tableContainer}>
                        <div className={styles.tableHeader}>
                            <div className={styles.colName}>Hạng mục công việc</div>
                            <div className={styles.colStatus}>Trạng thái</div>
                            <div className={styles.colProgress}>Tiến độ</div>
                        </div>

                        {visibleTasks.length === 0 ? (
                            <div className={styles.emptyState}>Không có hạng mục nào phù hợp.</div>
                        ) : (
                            <div className={styles.tableBody}>
                                {visibleTasks.map(task => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        highlight={filterCategory === 'ALL' && task.isParticipating}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// =============================================================================
// SUB-COMPONENT: TaskRow
// =============================================================================
const TaskRow = ({ task, highlight }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const statusInfo = TASK_STATUS_CONFIG[task.status];

    return (
        <div className={`${styles.taskRowWrapper} ${isExpanded ? styles.taskExpanded : ''} ${highlight ? styles.highlightedTask : ''}`}>
            {/* Main Row */}
            <div className={styles.taskRowMain} onClick={() => setIsExpanded(!isExpanded)}>
                <div className={styles.colName}>
                    <div className={styles.chevronIcon}>
                        {isExpanded ? <FaChevronDown/> : <FaChevronRight/>}
                    </div>

                    {/* Nếu đang highlight (chế độ xem Tất cả), hiện ngôi sao */}
                    {highlight && <FaStar className={styles.starIcon} title="Bạn có tham gia mục này"/>}

                    <span className={styles.taskName}>{task.name}</span>
                </div>

                <div className={styles.colStatus}>
                    <span className={styles.badge} style={{background: statusInfo.bg, color: statusInfo.color}}>
                        {statusInfo.label}
                    </span>
                </div>

                <div className={styles.colProgress}>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{width: `${task.progress}%`}}></div>
                    </div>
                    <span className={styles.progressText}>{task.progress}%</span>
                </div>
            </div>

            {/* Expanded Actions */}
            {isExpanded && (
                <div className={styles.actionDetailPanel}>
                    <div className={styles.actionHeaderTitle}>
                        <FiCheckSquare/> Hành động cụ thể
                    </div>
                    <table className={styles.actionTable}>
                        <thead>
                        <tr>
                            <th width="45%">Tên hành động</th>
                            <th width="20%">Người thực hiện</th>
                            <th width="15%">Trạng thái</th>
                            <th width="20%">Cập nhật tiến độ</th>
                        </tr>
                        </thead>
                        <tbody>
                        {task.actions.map(action => (
                            <ActionRow key={action.id} action={action} />
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// =============================================================================
// SUB-COMPONENT: ActionRow
// =============================================================================
const ActionRow = ({ action }) => {
    const [progress, setProgress] = useState(action.progress);
    const isMine = action.isMine;

    const handleProgressChange = (e) => {
        let val = parseInt(e.target.value);
        if (val > 100) val = 100;
        if (val < 0) val = 0;
        setProgress(val);
    };

    return (
        <tr className={`${styles.actionRow} ${isMine ? styles.myActionRow : ''}`}>
            <td>
                <div className={styles.actionNameCell}>
                    {isMine && <span className={styles.myTag}>Của tôi</span>}
                    {action.name}
                </div>
            </td>
            <td>
                <span className={styles.executor}>{action.executor}</span>
            </td>
            <td>
                <span className={styles.actionStatus}>
                    {action.status}
                </span>
            </td>
            <td>
                {isMine ? (
                    <div className={styles.controlCell}>
                        <input
                            type="number"
                            className={styles.inputProgress}
                            value={progress}
                            onChange={handleProgressChange}
                        />
                        <span className={styles.percent}>%</span>
                    </div>
                ) : (
                    <span className={styles.readOnlyText}>{action.progress}%</span>
                )}
            </td>
        </tr>
    );
};

export default TaskManagement;