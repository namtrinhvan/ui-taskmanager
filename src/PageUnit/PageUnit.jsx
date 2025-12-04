import React, {useEffect, useMemo, useState, useRef} from 'react';
import {useParams} from 'react-router-dom';
import axiosInstance from '../reusable/axiosInstance';
import styles from './PageUnit.module.scss';
import {
    FaBuilding,
    FaCheck,
    FaChevronDown,
    FaLayerGroup,
    FaRegUser,
    FaTimes,
    FaUserFriends,
    FaUserPlus,
    FaPaperPlane,
    FaClock,
    FaCodeBranch,
    FaSitemap,
    FaTasks,
    FaList,
    FaCalendarAlt,
    FaChartBar,
    FaSpinner,
    FaExclamationCircle,
    FaEdit
} from "react-icons/fa";
import {TbHierarchy, TbTargetArrow} from "react-icons/tb";
import {FiCalendar, FiChevronRight, FiPlus, FiTrash, FiMessageSquare, FiActivity} from "react-icons/fi";
import {LuFileText} from "react-icons/lu";

// --- Constants & Helpers ---
const LEVEL_LABEL = {
    DEPARTMENT: "Bộ phận", GROUP: "Nhóm", FUNCTION: "Chức năng"
};

const TASK_STATUS = {
    PENDING: {label: "Chờ xử lý", color: "#f1c40f", bg: "#fef9e7"},
    IN_PROGRESS: {label: "Đang thực hiện", color: "#3498db", bg: "#eaf2f8"},
    COMPLETED: {label: "Hoàn thành", color: "#2ecc71", bg: "#eafaf1"},
    CANCELLED: {label: "Hủy bỏ", color: "#e74c3c", bg: "#fdedec"},
    OVERDUE: {label: "Quá hạn", color: "#e67e22", bg: "#fef5e7"}
};

const getMonthRange = (start, end) => {
    if (!start || !end) return [];
    const startDate = new Date(start + "-01");
    const endDate = new Date(end + "-01");
    const list = [];
    while (startDate <= endDate) {
        const y = startDate.getFullYear();
        const m = String(startDate.getMonth() + 1).padStart(2, '0');
        list.push(`${y}-${m}`);
        startDate.setMonth(startDate.getMonth() + 1);
    }
    return list;
};

const getProgressDefault = (status) => {
    switch (status) {
        case 'COMPLETED':
            return 100;
        case 'IN_PROGRESS':
            return 50;
        case 'OVERDUE':
            return 90;
        default:
            return 0;
    }
};

// =============================================================================
// MAIN COMPONENT: PageUnit
// =============================================================================
const PageUnit = () => {
    const {unitId} = useParams();

    // --- Global State ---
    const [unitInfo, setUnitInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    // Plans
    const [ownedPlans, setOwnedPlans] = useState([]);
    const [participantPlans, setParticipantPlans] = useState([]);
    const [expandedPlanId, setExpandedPlanId] = useState(null);

    // --- Data Fetching ---
    useEffect(() => {
        if (!unitId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [uRes, ownedRes, partRes] = await Promise.all([axiosInstance.get(`/unit/structure/${unitId}`), axiosInstance.get(`/plan/unit/${unitId}`), axiosInstance.get(`/plan/participant/${unitId}`)]);

                setUnitInfo(uRes.data);
                setOwnedPlans(ownedRes.data);
                setParticipantPlans(partRes.data);
            } catch (err) {
                console.error("Error loading initial data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [unitId]);

    // --- Handlers: Create Plan (Only for Owned) ---
    const [isCreatingPlan, setIsCreatingPlan] = useState(false);
    const [newPlan, setNewPlan] = useState({name: '', startMonth: '', endMonth: ''});

    const handleCreatePlan = async () => {
        if (!newPlan.name || !newPlan.startMonth || !newPlan.endMonth) return alert("Vui lòng điền đủ thông tin kế hoạch.");
        try {
            const res = await axiosInstance.post('/plan', {...newPlan, unit: {id: unitId}});
            setOwnedPlans([res.data, ...ownedPlans]);
            setIsCreatingPlan(false);
            setNewPlan({name: '', startMonth: '', endMonth: ''});
        } catch (e) {
            alert("Lỗi khi tạo kế hoạch.");
        }
    };

    const handleDeletePlan = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Xóa kế hoạch này sẽ xóa toàn bộ tasks bên trong?")) return;
        try {
            await axiosInstance.delete(`/plan/${id}`);
            setOwnedPlans(prev => prev.filter(p => p.id !== id));
            if (expandedPlanId === id) setExpandedPlanId(null);
        } catch (e) {
            alert("Không thể xóa kế hoạch.");
        }
    };

    if (loading) return <div className={styles.loading}>Đang tải dữ liệu đơn vị...</div>;
    if (!unitInfo) return <div className={styles.error}>Không tìm thấy đơn vị.</div>;

    return (<div className={styles.container}>
        {/* Header Unit Info */}
        <div className={styles.topBar}>
            <div className={styles.breadcrumb}>
                <span className={styles.currentName}>{unitInfo.name}</span>
                <span className={`${styles.badge} ${styles[unitInfo.level]}`}>
                        {LEVEL_LABEL[unitInfo.level] || unitInfo.level}
                    </span>
            </div>
            <div className={styles.metaGroup}>
                <div className={styles.metaItem}>
                    <FaRegUser/> <span>{unitInfo.head || "Chưa có trưởng đơn vị"}</span>
                </div>
                <div className={styles.metaItem}>
                    <TbHierarchy/> <span>{unitInfo.children?.length || 0} đơn vị con</span>
                </div>
            </div>
        </div>

        <main className={styles.surface}>
            {/* Toolbar Create Plan */}
            <div className={styles.toolbar}>
                <h2>Quản lý Kế hoạch</h2>
                <button
                    className={`${styles.btnNew} ${isCreatingPlan ? styles.active : ''}`}
                    onClick={() => setIsCreatingPlan(!isCreatingPlan)}
                >
                    <FiPlus/> <span>Kế hoạch mới</span>
                </button>
            </div>

            {/* Form tạo Plan */}
            <div className={`${styles.createPanel} ${isCreatingPlan ? styles.open : ''}`}>
                <div className={styles.formGrid}>
                    <div className={styles.field}>
                        <label>Tên kế hoạch</label>
                        <input
                            type="text"
                            value={newPlan.name}
                            onChange={e => setNewPlan({...newPlan, name: e.target.value})}
                            placeholder="Ví dụ: Kế hoạch SXKD Quý 3..."
                        />
                    </div>
                    <div className={styles.field}>
                        <label>Bắt đầu</label>
                        <input
                            type="month"
                            value={newPlan.startMonth}
                            onChange={e => setNewPlan({...newPlan, startMonth: e.target.value})}
                        />
                    </div>
                    <div className={styles.field}>
                        <label>Kết thúc</label>
                        <input
                            type="month"
                            value={newPlan.endMonth}
                            onChange={e => setNewPlan({...newPlan, endMonth: e.target.value})}
                        />
                    </div>
                </div>
                <div className={styles.formActions}>
                    <button className={styles.btnText} onClick={() => setIsCreatingPlan(false)}>Hủy</button>
                    <button className={styles.btnPrimary} onClick={handleCreatePlan}>Lưu kế hoạch</button>
                </div>
            </div>

            {/* Danh sách Plans */}
            <div className={styles.listContainer}>

                {/* SECTION 1: OWNED PLANS */}
                <h3 className={styles.sectionTitle}>Kế hoạch đã tạo</h3>
                {ownedPlans.length === 0 ? (<div className={styles.emptyState}>
                        <p>Chưa tạo kế hoạch nào.</p>
                    </div>) : (ownedPlans.map(plan => (<PlanRow
                            key={plan.id}
                            plan={plan}
                            isExpanded={expandedPlanId === plan.id}
                            onToggle={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)}
                            onDelete={handleDeletePlan}
                            currentUnitId={unitId}
                            type="OWNER"
                        />)))}

                {/* SECTION 2: PARTICIPANT PLANS */}
                <h3 className={styles.sectionTitle} style={{marginTop: '32px'}}>Kế hoạch tham gia</h3>
                {participantPlans.length === 0 ? (<div className={styles.emptyState}>
                        <p>Chưa tham gia kế hoạch nào.</p>
                    </div>) : (participantPlans.map(plan => (<PlanRow
                            key={plan.id}
                            plan={plan}
                            isExpanded={expandedPlanId === plan.id}
                            onToggle={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)}
                            onDelete={() => {
                            }}
                            currentUnitId={unitId}
                            type="PARTICIPANT"
                        />)))}
            </div>
        </main>
    </div>);
};

// =============================================================================
// SUB-COMPONENT: PlanRow
// =============================================================================
const PlanRow = ({plan, isExpanded, onToggle, onDelete, currentUnitId, type}) => {
    return (<div className={`${styles.rowWrapper} ${isExpanded ? styles.expandedWrapper : ''}`}>
        <div className={styles.rowMain} onClick={onToggle}>
            <div className={styles.colName}>
                <div className={styles.iconDoc}><LuFileText/></div>
                <span className={styles.textName}>{plan.name}</span>
                {type === 'PARTICIPANT' && <span className={styles.tagParticipant}>Participant</span>}
            </div>
            <div className={styles.colTime}>
                <FiCalendar style={{marginRight: 6}}/>
                {plan.startMonth} — {plan.endMonth}
            </div>
            <div className={styles.colAction}>
                {type === 'OWNER' && (
                    <button className={styles.btnIcon} onClick={(e) => onDelete(e, plan.id)} title="Xóa">
                        <FiTrash/>
                    </button>)}
                <div className={`${styles.chevron} ${isExpanded ? styles.rotate : ''}`}>
                    <FaChevronDown/>
                </div>
            </div>
        </div>

        {isExpanded && (<div className={styles.rowDetail}>
            {type === 'OWNER' ? (<OwnerPlanDetailContent plan={plan} unitId={currentUnitId}/>) : (
                <ParticipantPlanDetailContent plan={plan} unitId={currentUnitId}/>)}
        </div>)}
    </div>);
};

// =============================================================================
// LOGIC 1: OWNER PLAN DETAIL (Giữ nguyên)
// =============================================================================
const OwnerPlanDetailContent = ({plan, unitId}) => {
    const [planTasks, setPlanTasks] = useState([]);
    const [subUnits, setSubUnits] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isFormOpen, setIsFormOpen] = useState(true);
    const [taskName, setTaskName] = useState("");
    const [selectedMonths, setSelectedMonths] = useState([]);
    const [assignMode, setAssignMode] = useState('UNIT');
    const [selectedSubUnits, setSelectedSubUnits] = useState([]);
    const [tempSelectedStaffs, setTempSelectedStaffs] = useState([]);
    const [pendingStaffGroups, setPendingStaffGroups] = useState([]);

    const monthRange = useMemo(() => getMonthRange(plan.startMonth, plan.endMonth), [plan]);

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            try {
                const [taskRes, subRes, staffRes] = await Promise.all([axiosInstance.get(`/task/plan/${plan.id}`), axiosInstance.get(`/unit/${unitId}/children`), axiosInstance.get(`/unit/${unitId}/staff`)]);
                setPlanTasks(taskRes.data);
                setSubUnits(subRes.data);
                setStaffList(staffRes.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [plan.id, unitId]);

    const toggleMonth = (m) => setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
    const toggleSubUnit = (id) => setSelectedSubUnits(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleTempStaff = (id) => setTempSelectedStaffs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const handleAddStaffGroup = () => {
        if (tempSelectedStaffs.length === 0) return;
        const selectedObjects = staffList.filter(s => tempSelectedStaffs.includes(s.id));
        setPendingStaffGroups(prev => [...prev, selectedObjects]);
        setTempSelectedStaffs([]);
    };
    const handleRemoveStaffGroup = (index) => setPendingStaffGroups(prev => prev.filter((_, i) => i !== index));

    const handleCreateTask = async () => {
        if (!taskName.trim() || selectedMonths.length === 0) return alert("Thiếu thông tin");
        if ((assignMode === 'UNIT' && selectedSubUnits.length === 0) || (assignMode === 'STAFF' && pendingStaffGroups.length === 0)) return alert("Chưa chọn đối tượng");
        try {
            const requests = [];
            for (const month of selectedMonths) {
                if (assignMode === 'UNIT') {
                    for (const subUnitId of selectedSubUnits) {
                        requests.push(axiosInstance.post('/task', {
                            name: taskName,
                            month: month,
                            description: "Unit Task",
                            plan: {id: plan.id},
                            assigner: {id: unitId},
                            assignee: {id: subUnitId},
                            executors: []
                        }));
                    }
                } else {
                    for (const group of pendingStaffGroups) {
                        requests.push(axiosInstance.post('/task', {
                            name: taskName,
                            month: month,
                            description: "Group Task",
                            plan: {id: plan.id},
                            assigner: {id: unitId},
                            assignee: {id: unitId},
                            executors: group.map(s => ({id: s.id}))
                        }));
                    }
                }
            }
            await Promise.all(requests);
            const res = await axiosInstance.get(`/task/plan/${plan.id}`);
            setPlanTasks(res.data);
            setTaskName("");
            setSelectedSubUnits([]);
            setPendingStaffGroups([]);
            setTempSelectedStaffs([]);
            alert("Đã tạo công việc thành công!");
        } catch (e) {
            alert("Lỗi tạo task");
        }
    };

    if (loading) return <div className={styles.loadingInner}>Đang tải chi tiết...</div>;

    return (<div className={styles.detailContainer}>
        <div className={styles.sectionHeader} onClick={() => setIsFormOpen(!isFormOpen)}>
            <h3>{isFormOpen ? <FaChevronDown/> : <FiChevronRight/>} Thêm Hạng mục công việc mới</h3>
        </div>
        {isFormOpen && (<div className={styles.taskForm}>
                <div className={styles.formRow}>
                    <label>Tên hạng mục:</label>
                    <input type="text" className={styles.inputName} placeholder="Nhập tên..." value={taskName}
                           onChange={e => setTaskName(e.target.value)}/>
                </div>
                <div className={styles.formRow}>
                    <label>Đối tượng:</label>
                    <div className={styles.assignTabs}>
                        <button className={assignMode === 'UNIT' ? styles.activeTab : ''}
                                onClick={() => setAssignMode('UNIT')}><FaBuilding/> Đơn vị
                        </button>
                        <button className={assignMode === 'STAFF' ? styles.activeTab : ''}
                                onClick={() => setAssignMode('STAFF')}><FaUserFriends/> Nhóm NV
                        </button>
                    </div>
                    {assignMode === 'UNIT' && (<div className={styles.assignList}>
                            {subUnits.length > 0 ? subUnits.map(u => (<div key={u.id}
                                                                           className={`${styles.checkItem} ${selectedSubUnits.includes(u.id) ? styles.checked : ''}`}
                                                                           onClick={() => toggleSubUnit(u.id)}>
                                    <div className={styles.box}></div>
                                    {u.name}
                                </div>)) : <span className={styles.emptyText}>Không có đơn vị con.</span>}
                        </div>)}
                    {assignMode === 'STAFF' && (<div className={styles.staffBuilder}>
                            <div className={styles.builderSelection}>
                                <div className={styles.builderHeader}>1. Chọn nhân viên:</div>
                                <div className={styles.assignList}>
                                    {staffList.length > 0 ? staffList.map(s => (<div key={s.id}
                                                                                     className={`${styles.checkItem} ${tempSelectedStaffs.includes(s.id) ? styles.checked : ''}`}
                                                                                     onClick={() => toggleTempStaff(s.id)}>
                                            <div className={styles.box}></div>
                                            {s.name}
                                        </div>)) : <span className={styles.emptyText}>Không có nhân viên.</span>}
                                </div>
                                <button className={styles.btnAddGroup} onClick={handleAddStaffGroup}
                                        disabled={tempSelectedStaffs.length === 0}><FaUserPlus/> Thêm nhóm
                                </button>
                            </div>
                            <div className={styles.builderReview}>
                                <div className={styles.builderHeader}>2. Các nhóm đã tạo:</div>
                                {pendingStaffGroups.length === 0 ?
                                    <div className={styles.emptyReview}>Chưa có nhóm.</div> : (
                                        <div className={styles.groupChips}>
                                            {pendingStaffGroups.map((group, idx) => (
                                                <div key={idx} className={styles.groupChip}>
                                                    <span className={styles.groupTitle}>Nhóm {idx + 1}:</span>
                                                    <span
                                                        className={styles.groupMembers}>{group.map(m => m.name).join(', ')}</span>
                                                    <button onClick={() => handleRemoveStaffGroup(idx)}
                                                            className={styles.btnRemoveGroup}><FaTimes/></button>
                                                </div>))}
                                        </div>)}
                            </div>
                        </div>)}
                </div>
                <div className={styles.formRow}>
                    <label>Tháng:</label>
                    <div className={styles.checkGroup}>
                        {monthRange.map(m => (<div key={m}
                                                   className={`${styles.checkTag} ${selectedMonths.includes(m) ? styles.checked : ''}`}
                                                   onClick={() => toggleMonth(m)}>{m}</div>))}
                    </div>
                </div>
                <div className={styles.formFooter}>
                    <button className={styles.btnSubmitTask} onClick={handleCreateTask}><FiPlus/> Tạo công việc</button>
                </div>
            </div>)}
        <div className={styles.gridContainer}>
            <h4>Danh sách Hạng mục công việc</h4>
            {planTasks.length === 0 ? <div className={styles.emptyGrid}>Chưa có công việc nào.</div> : (
                <div className={styles.taskGroups}>
                    {planTasks.map((group, idx) => <TaskGroupGrid key={idx} group={group} index={idx + 1}
                                                                  monthRange={monthRange}/>)}
                </div>)}
        </div>
    </div>);
};

// Component con cho Grid Owner
const TaskGroupGrid = ({group, index, monthRange}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const rows = useMemo(() => {
        const uniqueMap = new Map();
        group.tasks.forEach(task => {
            let key = "", label = "", type = "";
            if (task.assignee && task.assignee.id !== task.assigner?.id) {
                key = `U_${task.assignee.id}`;
                label = task.assignee.name;
                type = "UNIT";
            } else if (task.executors && task.executors.length > 0) {
                const ids = task.executors.map(e => e.id).sort().join('_');
                key = `S_${ids}`;
                label = task.executors.map(e => e.name).join(', ');
                type = "STAFF";
            } else {
                key = `U_${task.assignee?.id || 0}`;
                label = task.assignee?.name || "Unknown";
                type = "UNIT";
            }
            if (!uniqueMap.has(key)) uniqueMap.set(key, {key, label, type});
        });
        return Array.from(uniqueMap.values());
    }, [group]);
    const hasTask = (rowKey, month) => group.tasks.some(task => {
        if (task.month !== month) return false;
        let taskKey = "";
        if (task.assignee && task.assignee.id !== task.assigner?.id) taskKey = `U_${task.assignee.id}`; else if (task.executors && task.executors.length > 0) taskKey = `S_${task.executors.map(e => e.id).sort().join('_')}`; else taskKey = `U_${task.assignee?.id || 0}`;
        return taskKey === rowKey;
    });

    return (<div className={styles.taskGroupWrapper}>
        <div className={styles.groupHeader} onClick={() => setIsExpanded(!isExpanded)}>
            <div className={styles.groupTitle}>
                <span className={styles.index}>#{index}</span>
                <span className={styles.name}><FaLayerGroup/> {group.name}</span>
            </div>
            <div className={styles.chevron}>{isExpanded ? <FaChevronDown/> : <FiChevronRight/>}</div>
        </div>
        {isExpanded && (<div className={styles.gridTable}>
            <div className={styles.gridHeaderRow}>
                <div className={styles.colObj}>Đối tượng thực hiện</div>
                {monthRange.map(m => <div key={m} className={styles.colMonth}>{m}</div>)}
            </div>
            {rows.map(row => (<div key={row.key} className={styles.gridRow}>
                <div className={styles.colObj}>{row.type === 'UNIT' ? <FaBuilding className={styles.iconU}/> :
                    <FaUserFriends className={styles.iconS}/>} <span>{row.label}</span></div>
                {monthRange.map(m => {
                    const active = hasTask(row.key, m);
                    return (<div key={m} className={`${styles.cell} ${active ? styles.activeCell : ''}`}>{active &&
                        <FaCheck/>}</div>)
                })}
            </div>))}
        </div>)}
    </div>);
};

// =============================================================================
// LOGIC 2: PARTICIPANT PLAN DETAIL (Đã nâng cấp: Thêm Month View)
// =============================================================================
const ParticipantPlanDetailContent = ({plan, unitId}) => {
    const [planTasks, setPlanTasks] = useState([]); // List<PlanTaskDTO>
    const [subUnits, setSubUnits] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- View Mode State ---
    const [viewMode, setViewMode] = useState('ALL'); // 'ALL' or 'MONTH'
    const [selectedViewMonth, setSelectedViewMonth] = useState("");

    // Modals
    const [assignModalData, setAssignModalData] = useState(null);
    const [actionModalData, setActionModalData] = useState(null);

    const monthRange = useMemo(() => getMonthRange(plan.startMonth, plan.endMonth), [plan]);

    useEffect(() => {
        // Mặc định chọn tháng hiện tại hoặc tháng đầu tiên nếu chưa có
        if (monthRange.length > 0 && !selectedViewMonth) {
            setSelectedViewMonth(monthRange[0]);
        }
    }, [monthRange]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [taskRes, subRes, staffRes] = await Promise.all([axiosInstance.get(`/task/plan/${plan.id}/${unitId}`), axiosInstance.get(`/unit/${unitId}/children`), axiosInstance.get(`/unit/${unitId}/staff`)]);
            setPlanTasks(taskRes.data);
            setSubUnits(subRes.data);
            setStaffList(staffRes.data);
        } catch (e) {
            console.error("Failed to load participant data", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [plan.id, unitId]);

    // --- Computed Data for Month View ---
    const tasksInSelectedMonth = useMemo(() => {
        if (viewMode !== 'MONTH' || !selectedViewMonth) return [];
        // Flatten List<PlanTaskDTO> to List<TaskDTO> filtered by month
        const flatList = [];
        planTasks.forEach(group => {
            const taskInMonth = group.tasks.find(t => t.month === selectedViewMonth);
            if (taskInMonth) {
                flatList.push(taskInMonth);
            }
        });
        return flatList;
    }, [planTasks, viewMode, selectedViewMonth]);


    // Modal Handlers
    const openAssignModalRow = (group) => setAssignModalData({group, fixedMonth: null});
    const openAssignModalCell = (group, month) => setAssignModalData({group, fixedMonth: month});

    const openActionModalRow = (group) => setActionModalData({group, fixedMonth: null});
    const openActionModalCell = (group, month) => setActionModalData({group, fixedMonth: month});

    const handleModalSuccess = () => {
        setAssignModalData(null);
        setActionModalData(null);
        fetchData();
    };

    if (loading) return <div className={styles.loadingInner}>Đang tải phân công...</div>;

    return (<div className={styles.detailContainer}>
            <div className={styles.headerControls}>
                <h4 className={styles.tableTitle}>Bảng phân công nhiệm vụ</h4>

                {/* VIEW MODE CONTROLS */}
                <div className={styles.viewModeGroup}>
                    <div className={styles.toggleButtons}>
                        <button
                            className={`${styles.toggleBtn} ${viewMode === 'ALL' ? styles.active : ''}`}
                            onClick={() => setViewMode('ALL')}
                        >
                            <FaList/> Toàn bộ
                        </button>
                        <button
                            className={`${styles.toggleBtn} ${viewMode === 'MONTH' ? styles.active : ''}`}
                            onClick={() => setViewMode('MONTH')}
                        >
                            <FaCalendarAlt/> Theo tháng
                        </button>
                    </div>

                    {viewMode === 'MONTH' && (<div className={styles.monthSelector}>
                            <select
                                value={selectedViewMonth}
                                onChange={(e) => setSelectedViewMonth(e.target.value)}
                                className={styles.monthSelectDropdown}
                            >
                                {monthRange.map(m => (<option key={m} value={m}>Tháng {m}</option>))}
                            </select>
                        </div>)}
                </div>
            </div>

            {/* --- VIEW 1: ALL GRID --- */}
            {viewMode === 'ALL' && (planTasks.length === 0 ? (
                    <div className={styles.emptyGrid}>Chưa có nhiệm vụ nào được phân công.</div>) : (
                    <div className={styles.participantTable}>
                        <div className={styles.ptHeaderRow}>
                            <div className={styles.ptColName}>Hạng mục công việc</div>
                            {monthRange.map(m => (<div key={m} className={styles.ptColMonth}>{m}</div>))}
                            <div className={styles.ptColAction}>Hành động</div>
                        </div>

                        {planTasks.map((group, idx) => (<ParticipantTaskRow
                                key={idx}
                                group={group}
                                monthRange={monthRange}
                                onAssignRow={() => openAssignModalRow(group)}
                                onAssignCell={(m) => openAssignModalCell(group, m)}
                                onActionRow={() => openActionModalRow(group)}
                                onActionCell={(m) => openActionModalCell(group, m)}
                            />))}
                    </div>))}

            {/* --- VIEW 2: MONTH LIST (NEW) --- */}
            {viewMode === 'MONTH' && (tasksInSelectedMonth.length === 0 ? (
                    <div className={styles.emptyGrid}>Không có nhiệm vụ trong tháng {selectedViewMonth}.</div>) : (
                    <div className={styles.monthViewContainer}>
                        <div className={styles.mvHeader}>
                            <div className={styles.mvColName}>Tên công việc</div>
                            <div className={styles.mvColAssignee}>Giao cho</div>
                            <div className={styles.mvColProgress}>Tiến độ</div>
                            <div className={styles.mvColStatus}>Trạng thái</div>
                            <div className={styles.mvColDate}>Bắt đầu</div>
                            <div className={styles.mvColDate}>Kết thúc</div>
                        </div>
                        <div className={styles.mvBody}>
                            {tasksInSelectedMonth.map(task => (<ParticipantMonthTaskRow key={task.id} task={task}/>))}
                        </div>
                    </div>))}

            {/* Modal Giao việc (Task/Executor) */}
            {assignModalData && (<TaskAssignmentModal
                    isOpen={!!assignModalData}
                    onClose={() => setAssignModalData(null)}
                    onSuccess={handleModalSuccess}
                    plan={plan}
                    currentUnitId={unitId}
                    subUnits={subUnits}
                    staffList={staffList}
                    targetGroup={assignModalData.group}
                    fixedMonth={assignModalData.fixedMonth}
                    monthRange={monthRange}
                />)}

            {/* Modal Tạo Action (Hành động) */}
            {actionModalData && (<ActionCreationModal
                    isOpen={!!actionModalData}
                    onClose={() => setActionModalData(null)}
                    onSuccess={handleModalSuccess}
                    staffList={staffList}
                    targetGroup={actionModalData.group}
                    fixedMonth={actionModalData.fixedMonth}
                    monthRange={monthRange}
                />)}
        </div>);
};

// Component Row for "Month View" with Mock Actions, Dropdown Status & Progress Input
const ParticipantMonthTaskRow = ({task}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [actions, setActions] = useState([]);
    const [loadingActions, setLoadingActions] = useState(false);

    // Local State for Instant UI Feedback (Status & Progress)
    const [localStatus, setLocalStatus] = useState(task.status || "PENDING");
    const [localProgress, setLocalProgress] = useState(getProgressDefault(task.status));

    const statusInfo = TASK_STATUS[localStatus] || TASK_STATUS.PENDING;

    // --- Mock Data Generator with Progress ---
    const generateMockActions = (taskId) => {
        return [{
            id: taskId * 10 + 1,
            name: "Khảo sát và thu thập yêu cầu",
            description: "Làm việc với các bên liên quan để chốt scope",
            executor: {name: "Nguyễn Văn An"},
            status: "COMPLETED",
            progress: 100
        }, {
            id: taskId * 10 + 2,
            name: "Lên kế hoạch chi tiết",
            description: "WBS và timeline cụ thể",
            executor: {name: "Trần Thị Bích"},
            status: "IN_PROGRESS",
            progress: 65
        }, {
            id: taskId * 10 + 3,
            name: "Thực hiện triển khai giai đoạn 1",
            description: "Setup môi trường và coding core features",
            executor: {name: "Lê Hoàng Nam"},
            status: "PENDING",
            progress: 0
        },];
    };

    const fetchActions = async () => {
        if (actions.length > 0) return;
        setLoadingActions(true);
        try {
            // Giả định gọi API. Nếu fail hoặc rỗng thì dùng Mock như yêu cầu.
            const res = await axiosInstance.get(`/task/${task.id}/actions`);
            if (res.data && res.data.length > 0) {
                setActions(res.data);
            } else {
                setActions(generateMockActions(task.id));
            }
        } catch (e) {
            console.warn("API Error, using mock actions");
            setActions(generateMockActions(task.id));
        } finally {
            setLoadingActions(false);
        }
    };

    const handleExpand = () => {
        const nextState = !isExpanded;
        setIsExpanded(nextState);
        if (nextState) {
            fetchActions();
        }
    };

    const handleStatusChange = (e) => {
        e.stopPropagation();
        setLocalStatus(e.target.value);
        // TODO: Call API to update status here
    };

    const handleProgressChange = (e) => {
        e.stopPropagation();
        let val = parseInt(e.target.value);
        if (isNaN(val)) val = 0;
        if (val > 100) val = 100;
        if (val < 0) val = 0;
        setLocalProgress(val);
        // TODO: Call API to update progress here
    };

    const getActionStatusColor = (status) => {
        return (TASK_STATUS[status] || TASK_STATUS.PENDING).color;
    };

    // Xác định người được giao
    let assigneeLabel = "Chưa giao";
    if (task.assignee && task.assignee.id) {
        assigneeLabel = `${task.executors.length} Nhân sự`;
    } else if (task.executors && task.executors.length > 0) {
        assigneeLabel = `${task.executors.length} Nhân sự`;
    }

    const startDate = `${task.month}-01`;
    const deadlineOriginal = `${task.month}-28`;

    return (<div className={`${styles.mvRowWrapper} ${isExpanded ? styles.mvExpanded : ''}`}>
            <div className={styles.mvRowMain} onClick={handleExpand}>
                <div className={styles.mvColName}>
                    <div className={styles.mvChevron}>{isExpanded ? <FaChevronDown/> : <FiChevronRight/>}</div>
                    <span className={styles.taskName}>{task.name}</span>
                </div>
                <div className={styles.mvColAssignee}>
                    <FaRegUser style={{marginRight: 4, fontSize: 12}}/> {assigneeLabel}
                </div>

                {/* --- Editable Progress --- */}
                <div className={styles.mvColProgress} onClick={e => e.stopPropagation()}>
                    <div className={styles.progressInputWrapper}>
                        <div className={styles.progressContainer}>
                            <div className={styles.progressBar}
                                 style={{width: `${localProgress}%`, backgroundColor: statusInfo.color}}></div>
                        </div>
                        <input
                            type="number"
                            className={styles.progressInput}
                            value={localProgress}
                            onChange={handleProgressChange}
                            min="0" max="100"
                        />
                        <span className={styles.percentSymbol}>%</span>
                    </div>
                </div>

                {/* --- Dropdown Status --- */}
                <div className={styles.mvColStatus} onClick={e => e.stopPropagation()}>
                    <select
                        className={styles.statusSelect}
                        value={localStatus}
                        onChange={handleStatusChange}
                        style={{
                            backgroundColor: statusInfo.bg, color: statusInfo.color, borderColor: statusInfo.color
                        }}
                    >
                        {Object.keys(TASK_STATUS).map(key => (
                            <option key={key} value={key}>{TASK_STATUS[key].label}</option>))}
                    </select>
                </div>

                <div className={styles.mvColDate}>{startDate}</div>
                <div className={styles.mvColDate}>{deadlineOriginal}</div>
            </div>

            {/* --- Expanded Detail: Mock Actions Table --- */}
            {isExpanded && (<div className={styles.mvDetailPanel}>
                    <h5 className={styles.actionTitle}><FaTasks/> Chi tiết hạng mục & Hành động (Actions)</h5>
                    {loadingActions ? (
                        <div className={styles.loadingActions}><FaSpinner className={styles.spin}/> Đang tải hành
                            động...</div>) : (<div className={styles.actionTableWrapper}>
                            <table className={styles.actionTable}>
                                <thead>
                                <tr>
                                    <th style={{width: '50px'}}>STT</th>
                                    <th style={{width: '25%'}}>Tên hành động</th>
                                    <th style={{width: '25%'}}>Mô tả chi tiết</th>
                                    <th style={{width: '15%'}}>Người thực hiện</th>
                                    <th style={{width: '15%'}}>Tiến độ</th>
                                    <th style={{width: '15%'}}>Trạng thái</th>
                                </tr>
                                </thead>
                                <tbody>
                                {actions.map((action, idx) => (<tr key={action.id}>
                                        <td className={styles.centerText}>{idx + 1}</td>
                                        <td className={styles.fw500}><TbTargetArrow
                                            className={styles.iconSmall}/> {action.name}</td>
                                        <td className={styles.descText}>{action.description || "--"}</td>
                                        <td>
                                            <div className={styles.executorTag}>
                                                <FaRegUser/> {action.executor?.name || "Chưa giao"}
                                            </div>
                                        </td>
                                        <td>
                                            {/* Mini Progress Bar for Action */}
                                            <div className={styles.miniProgressWrapper}>
                                                <div className={styles.miniProgressBar}>
                                                    <div
                                                        className={styles.miniProgressFill}
                                                        style={{
                                                            width: `${action.progress || 0}%`,
                                                            backgroundColor: getActionStatusColor(action.status)
                                                        }}
                                                    ></div>
                                                </div>
                                                <span className={styles.miniProgressText}>{action.progress || 0}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            {/* Mock Status Display for Action */}
                                            <span className={styles.actionStatusBadge}
                                                  data-status={action.status || "PENDING"}>
                                                    {action.status === 'COMPLETED' ? "Hoàn thành" : action.status === 'IN_PROGRESS' ? "Đang làm" : "Chờ"}
                                                </span>
                                        </td>
                                    </tr>))}
                                {/* Mock Empty Row for Visual purpose if needed */}
                                {actions.length === 0 && (<tr>
                                        <td colSpan="6" className={styles.centerText}>Chưa có hành động nào.</td>
                                    </tr>)}
                                </tbody>
                            </table>
                            <div className={styles.actionFooter}>
                                <button className={styles.btnQuickAdd}><FiPlus/> Thêm nhanh hành động</button>
                            </div>
                        </div>)}
                </div>)}
        </div>)
};


const ParticipantTaskRow = ({group, monthRange, onAssignRow, onAssignCell, onActionRow, onActionCell}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const getTaskInMonth = (month) => group.tasks.find(t => t.month === month);

    return (<div className={`${styles.ptRowWrapper} ${isExpanded ? styles.expanded : ''}`}>
            <div className={styles.ptRow}>
                <div className={styles.ptColName}>
                    <FaLayerGroup className={styles.iconName}/>
                    {group.name}
                </div>
                {monthRange.map(m => {
                    const hasTask = !!getTaskInMonth(m);
                    return (<div key={m} className={`${styles.ptColMonth} ${hasTask ? styles.active : ''}`}>
                            {hasTask && (<div className={styles.cellContent}>
                                    <FaCheck className={styles.checkIcon}/>
                                    <div className={styles.cellHoverActions}>
                                        <button
                                            className={styles.btnCellAssign}
                                            title="Giao việc con / Thêm nhân sự"
                                            onClick={() => onAssignCell(m)}
                                        >
                                            Giao hạng mục
                                        </button>
                                        <button
                                            className={styles.btnCellAction}
                                            title="Tạo hành động (Action)"
                                            onClick={() => onActionCell(m)}
                                        >
                                            Tạo hành động
                                        </button>
                                    </div>
                                </div>)}
                        </div>);
                })}
                <div className={styles.ptColAction}>
                    <button className={styles.btnActionIcon} onClick={onActionRow} title="Tạo Action cho Task">
                        <FaTasks/>
                    </button>
                    <button className={styles.btnActionIcon} onClick={onAssignRow} title="Phân rã / Giao việc">
                        <FaCodeBranch/>
                    </button>
                    <button className={styles.btnExpandChat} onClick={() => setIsExpanded(!isExpanded)}
                            title="Thảo luận chi tiết">
                        {isExpanded ? "Đóng" : "Chi tiết"}
                        <FiMessageSquare/>
                    </button>
                </div>
            </div>

            {isExpanded && (<div className={styles.ptDetailPanel}>
                    <ParticipantInteractionPanel tasks={group.tasks}/>
                </div>)}
        </div>);
};

// =============================================================================
// COMPONENT: TaskAssignmentModal (Task/Executor)
// =============================================================================
const TaskAssignmentModal = ({
                                 isOpen,
                                 onClose,
                                 onSuccess,
                                 plan,
                                 currentUnitId,
                                 subUnits,
                                 staffList,
                                 targetGroup,
                                 fixedMonth,
                                 monthRange
                             }) => {
    if (!isOpen) return null;

    const [assignMode, setAssignMode] = useState('UNIT');
    const [taskName, setTaskName] = useState(`Triển khai: ${targetGroup.name}`);
    const [selectedMonths, setSelectedMonths] = useState(fixedMonth ? [fixedMonth] : []);

    const [selectedSubUnits, setSelectedSubUnits] = useState([]);
    const [tempSelectedStaffs, setTempSelectedStaffs] = useState([]);
    const [pendingStaffGroups, setPendingStaffGroups] = useState([]);

    const toggleMonth = (m) => {
        if (fixedMonth) return;
        setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
    };
    const toggleSubUnit = (id) => setSelectedSubUnits(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleTempStaff = (id) => setTempSelectedStaffs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const handleAddStaffGroup = () => {
        if (tempSelectedStaffs.length === 0) return;
        const selectedObjects = staffList.filter(s => tempSelectedStaffs.includes(s.id));
        setPendingStaffGroups(prev => [...prev, selectedObjects]);
        setTempSelectedStaffs([]);
    };
    const handleRemoveStaffGroup = (index) => setPendingStaffGroups(prev => prev.filter((_, i) => i !== index));

    const handleSubmit = async () => {
        if (selectedMonths.length === 0) return alert("Chọn tháng");
        if ((assignMode === 'UNIT' && selectedSubUnits.length === 0) || (assignMode === 'STAFF' && pendingStaffGroups.length === 0 && tempSelectedStaffs.length === 0)) return alert("Chọn đối tượng");
        if (assignMode === 'UNIT' && !taskName.trim()) return alert("Nhập tên công việc con");

        try {
            const requests = [];

            for (const month of selectedMonths) {
                const parentTask = targetGroup.tasks.find(t => t.month === month);
                if (!parentTask) continue;

                // CASE 1: Assign to UNIT -> Create NEW Sub-Task (POST /task)
                if (assignMode === 'UNIT') {
                    for (const subUnitId of selectedSubUnits) {
                        requests.push(axiosInstance.post('/task', {
                            name: taskName,
                            month: month,
                            description: "Sub-task assigned via Participant View",
                            plan: {id: plan.id},
                            assigner: {id: currentUnitId},
                            parentTask: {id: parentTask.id},
                            assignee: {id: subUnitId},
                            executors: []
                        }));
                    }
                }
                // CASE 2: Assign to STAFF -> Add Executors to EXISTING Parent Task (POST /task/{id}/executors)
                else {
                    const allStaffIds = new Set(tempSelectedStaffs);
                    pendingStaffGroups.flat().forEach(s => allStaffIds.add(s.id));
                    const staffIdList = Array.from(allStaffIds);

                    if (staffIdList.length > 0) {
                        requests.push(axiosInstance.post(`/task/${parentTask.id}/executors`, staffIdList));
                    }
                }
            }

            if (requests.length === 0) return alert("Không tìm thấy task gốc cho các tháng đã chọn.");

            await Promise.all(requests);
            alert("Giao việc thành công!");
            onSuccess();
        } catch (e) {
            console.error(e);
            alert("Lỗi khi giao việc.");
        }
    };

    return (<div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3><FaSitemap/> Giao việc: {fixedMonth ? `Tháng ${fixedMonth}` : "Phân rã công việc"}</h3>
                    <button onClick={onClose}><FaTimes/></button>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.formRow}>
                        <label>Hình thức giao việc:</label>
                        <div className={styles.assignTabs}>
                            <button className={assignMode === 'UNIT' ? styles.activeTab : ''}
                                    onClick={() => setAssignMode('UNIT')}><FaBuilding/> Giao Đơn vị con (Tạo Task mới)
                            </button>
                            <button className={assignMode === 'STAFF' ? styles.activeTab : ''}
                                    onClick={() => setAssignMode('STAFF')}><FaUserFriends/> Giao Nhân sự (Thêm người
                                làm)
                            </button>
                        </div>
                    </div>

                    {assignMode === 'UNIT' && (<div className={styles.formRow}>
                            <label>Tên công việc con:</label>
                            <input type="text" className={styles.inputName} value={taskName}
                                   onChange={e => setTaskName(e.target.value)}/>
                        </div>)}

                    <div className={styles.formRow}>
                        <label>Tháng áp dụng:</label>
                        <div className={styles.checkGroup}>
                            {monthRange.map(m => (<div
                                    key={m}
                                    className={`${styles.checkTag} ${selectedMonths.includes(m) ? styles.checked : ''} ${fixedMonth && m !== fixedMonth ? styles.disabled : ''}`}
                                    onClick={() => toggleMonth(m)}
                                >
                                    {m}
                                </div>))}
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        <label>Đối tượng:</label>
                        <div className={styles.modalAssignList}>
                            {assignMode === 'UNIT' ? (subUnits.map(u => (<div key={u.id}
                                                                              className={`${styles.checkItem} ${selectedSubUnits.includes(u.id) ? styles.checked : ''}`}
                                                                              onClick={() => toggleSubUnit(u.id)}>
                                        <div className={styles.box}></div>
                                        {u.name}
                                    </div>))) : (<>
                                    <div className={styles.staffSelectArea}>
                                        {staffList.map(s => (<div key={s.id}
                                                                  className={`${styles.checkItem} ${tempSelectedStaffs.includes(s.id) ? styles.checked : ''}`}
                                                                  onClick={() => toggleTempStaff(s.id)}>
                                                <div className={styles.box}></div>
                                                {s.name}
                                            </div>))}
                                    </div>
                                    <button className={styles.btnSmallAdd} onClick={handleAddStaffGroup}
                                            disabled={tempSelectedStaffs.length === 0}><FaUserPlus/> Tạo thành nhóm (Tùy
                                        chọn)
                                    </button>
                                    {pendingStaffGroups.length > 0 && (<div className={styles.groupChips}>
                                            {pendingStaffGroups.map((g, i) => (
                                                <div key={i} className={styles.groupChip}>
                                                    <span>Nhóm {i + 1}: {g.map(m => m.name).join(', ')}</span>
                                                    <FaTimes onClick={() => handleRemoveStaffGroup(i)}
                                                             style={{cursor: 'pointer'}}/>
                                                </div>))}
                                        </div>)}
                                </>)}
                        </div>
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.btnCancel} onClick={onClose}>Hủy</button>
                    <button className={styles.btnSubmit} onClick={handleSubmit}>
                        {assignMode === 'UNIT' ? "Tạo công việc con" : "Thêm người thực hiện"}
                    </button>
                </div>
            </div>
        </div>);
};

// =============================================================================
// NEW COMPONENT: ActionCreationModal (Create Action)
// =============================================================================
const ActionCreationModal = ({
                                 isOpen, onClose, onSuccess, staffList, targetGroup, fixedMonth, monthRange
                             }) => {
    if (!isOpen) return null;

    const [actionName, setActionName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedMonths, setSelectedMonths] = useState(fixedMonth ? [fixedMonth] : []);
    const [selectedStaffId, setSelectedStaffId] = useState(null); // Single Staff

    const toggleMonth = (m) => {
        if (fixedMonth) return;
        setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
    };

    const handleSubmit = async () => {
        if (!actionName.trim()) return alert("Nhập tên hành động");
        if (selectedMonths.length === 0) return alert("Chọn tháng");
        if (!selectedStaffId) return alert("Chọn người thực hiện (1 người)");

        try {
            const requests = [];
            for (const month of selectedMonths) {
                const parentTask = targetGroup.tasks.find(t => t.month === month);
                if (!parentTask) continue;

                // POST /task/action
                const payload = {
                    taskId: parentTask.id, name: actionName, description: description, executor: {id: selectedStaffId} // Single executor
                };
                requests.push(axiosInstance.post('/task/action', payload));
            }

            if (requests.length === 0) return alert("Không tìm thấy task gốc cho các tháng đã chọn.");

            await Promise.all(requests);
            alert("Tạo Action thành công!");
            onSuccess();
        } catch (e) {
            console.error(e);
            alert("Lỗi khi tạo Action.");
        }
    };

    return (<div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3><FaTasks/> Tạo hành động (Action)</h3>
                    <button onClick={onClose}><FaTimes/></button>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.formRow}>
                        <label>Tên hành động:</label>
                        <input type="text" className={styles.inputName} value={actionName}
                               onChange={e => setActionName(e.target.value)}
                               placeholder="Ví dụ: Lập báo cáo, Kiểm tra hiện trường..."/>
                    </div>

                    <div className={styles.formRow}>
                        <label>Mô tả chi tiết:</label>
                        <input type="text" className={styles.inputName} value={description}
                               onChange={e => setDescription(e.target.value)} placeholder="Ghi chú thêm..."/>
                    </div>

                    <div className={styles.formRow}>
                        <label>Tháng áp dụng:</label>
                        <div className={styles.checkGroup}>
                            {monthRange.map(m => (<div
                                    key={m}
                                    className={`${styles.checkTag} ${selectedMonths.includes(m) ? styles.checked : ''} ${fixedMonth && m !== fixedMonth ? styles.disabled : ''}`}
                                    onClick={() => toggleMonth(m)}
                                >
                                    {m}
                                </div>))}
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        <label>Người thực hiện (Chọn 1):</label>
                        <div className={styles.modalAssignList}>
                            <div className={styles.staffSelectArea}>
                                {staffList.map(s => (<div
                                        key={s.id}
                                        className={`${styles.checkItem} ${selectedStaffId === s.id ? styles.checked : ''}`}
                                        onClick={() => setSelectedStaffId(s.id)}
                                    >
                                        <div
                                            className={`${styles.radioCircle} ${selectedStaffId === s.id ? styles.active : ''}`}></div>
                                        {s.name}
                                    </div>))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.btnCancel} onClick={onClose}>Hủy</button>
                    <button className={styles.btnSubmit} onClick={handleSubmit}>Tạo Action</button>
                </div>
            </div>
        </div>);
};

// Panel tương tác (Comments)
const ParticipantInteractionPanel = ({tasks}) => {
    const [selectedTask, setSelectedTask] = useState(tasks.length > 0 ? tasks[0] : null);
    const sortedTasks = useMemo(() => [...tasks].sort((a, b) => a.month.localeCompare(b.month)), [tasks]);

    return (<div className={styles.interactionContainer}>
            <div className={styles.taskList}>
                <div className={styles.listHeader}>Chọn tháng thực hiện:</div>
                {sortedTasks.map(task => (<div key={task.id}
                                               className={`${styles.taskItem} ${selectedTask?.id === task.id ? styles.selected : ''}`}
                                               onClick={() => setSelectedTask(task)}>
                        <FaClock className={styles.iconClock}/>
                        <span>Tháng {task.month}</span>
                    </div>))}
            </div>
            <div className={styles.commentSection}>
                {selectedTask ?
                    <CommentBox taskId={selectedTask.id} taskName={selectedTask.name} month={selectedTask.month}/> :
                    <div className={styles.noSelection}>Chọn một tháng để xem thảo luận</div>}
            </div>
        </div>);
};

// Reusable Comment Box Component
const CommentBox = ({taskId, taskName, month}) => {
    const [comments, setComments] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const fetchComments = async () => {
        try {
            const res = await axiosInstance.get(`/task/${taskId}/comments`);
            setComments(res.data);
        } catch (e) {
            console.error("Load comments error", e);
        }
    };
    useEffect(() => {
        if (taskId) fetchComments();
    }, [taskId]);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, [comments]);

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        setLoading(true);
        try {
            await axiosInstance.post('/task/comment', {taskId: taskId, message: newMessage, owner: {id: 1}});
            setNewMessage("");
            fetchComments();
        } catch (e) {
            alert("Gửi tin nhắn thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (<div className={styles.chatBox}>
            <div className={styles.chatHeader}><strong>Thảo luận:</strong> {taskName} (Tháng {month})</div>
            <div className={styles.messagesArea}>
                {comments.length === 0 ?
                    <div className={styles.emptyChat}>Chưa có thảo luận nào. Hãy bắt đầu!</div> : comments.map(c => (
                        <div key={c.id} className={styles.messageRow}>
                            <div className={styles.avatar}>{c.owner?.name?.charAt(0) || "U"}</div>
                            <div className={styles.content}>
                                <div className={styles.sender}>{c.owner?.name || "Unknown"} <span
                                    className={styles.time}>{c.timestamp}</span></div>
                                <div className={styles.text}>{c.message}</div>
                            </div>
                        </div>))}
                <div ref={messagesEndRef}/>
            </div>
            <div className={styles.inputArea}>
                <input type="text" placeholder="Nhập nội dung thảo luận..." value={newMessage}
                       onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                       disabled={loading}/>
                <button onClick={handleSend} disabled={loading || !newMessage.trim()}><FaPaperPlane/></button>
            </div>
        </div>);
};

export default PageUnit;