import React, {useState, useEffect, useMemo, useRef} from 'react';
import {useParams} from 'react-router-dom';
import axiosInstance from '../reusable/axiosInstance';
import styles from './PageDepartment.module.scss';
import {
    FiPlus,
    FiFileText,
    FiCalendar,
    FiArrowLeft,
    FiLayers,
    FiUsers,
    FiChevronDown,
    FiChevronRight,
    FiCheck,
    FiLoader,
    FiMessageSquare,
    FiClock,
    FiUserCheck,
    FiSend,
    FiEdit2,
    FiAlertCircle,
    FiList,
    FiTarget,
    FiActivity
} from "react-icons/fi";
import {FaBuilding, FaUserCircle} from "react-icons/fa";

// --- Helpers ---
const getMonthRange = (start, end) => {
    if (!start || !end) return [];
    const list = [];
    let cur = new Date(start + "-01");
    let last = new Date(end + "-01");
    while (cur <= last) {
        let m = cur.toISOString().slice(0, 7);
        list.push(m);
        cur.setMonth(cur.getMonth() + 1);
    }
    return list;
};

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================
const PageDepartment = () => {
    const {unitId} = useParams();

    // --- State ---
    const [unitInfo, setUnitInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    // Plans Data
    const [ownedPlans, setOwnedPlans] = useState([]);
    const [participantPlans, setParticipantPlans] = useState([]);

    // UI State
    const [activeTab, setActiveTab] = useState('OWNED'); // 'OWNED' | 'PARTICIPANT'
    const [selectedPlan, setSelectedPlan] = useState(null); // Detail View
    const [isCreatePlanModalOpen, setCreatePlanModalOpen] = useState(false);

    // --- Fetch Data ---
    useEffect(() => {
        if (!unitId) return;

        // FIX 2: Reset selected plan when switching units to prevent confusion
        setSelectedPlan(null);
        setActiveTab('OWNED')
        const fetchData = async () => {
            setLoading(true);
            try {
                const [uRes, ownedRes, partRes] = await Promise.all([axiosInstance.get(`/unit/structure/${unitId}`), axiosInstance.get(`/plan/unit/${unitId}`), axiosInstance.get(`/plan/participant/${unitId}`)]);
                setUnitInfo(uRes.data);
                setOwnedPlans(ownedRes.data || []);
                setParticipantPlans(partRes.data || []);
            } catch (err) {
                console.error("Error loading unit data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [unitId]);

    const handleCreatePlanSuccess = (newPlan) => {
        setOwnedPlans([newPlan, ...ownedPlans]);
        setCreatePlanModalOpen(false);
    };

    if (loading) return <div className={styles.container}>Đang tải dữ liệu...</div>;
    if (!unitInfo) return <div className={styles.container}>Không tìm thấy thông tin đơn vị.</div>;

    // --- Detail View ---
    if (selectedPlan) {
        return (<div className={styles.container}>
            <PlanDetailView
                plan={selectedPlan}
                unitId={unitId}
                onBack={() => setSelectedPlan(null)}
                isOwner={activeTab === 'OWNED'}
            />
        </div>);
    }

    // --- Overview View ---
    return (<div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
            <div className={styles.titleGroup}>
                <h1>
                    {unitInfo.name}
                    <span className={styles.badge}>{unitInfo.level}</span>
                </h1>
            </div>
            {activeTab === 'OWNED' && (<button
                className={styles.btnPrimary}
                onClick={() => setCreatePlanModalOpen(true)}
            >
                <FiPlus size={20}/> Tạo kế hoạch mới
            </button>)}
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
            <button
                className={`${styles.tab} ${activeTab === 'OWNED' ? styles.active : ''}`}
                onClick={() => setActiveTab('OWNED')}
            >
                Kế hoạch đã tạo ({ownedPlans.length})
            </button>
            <button
                className={`${styles.tab} ${activeTab === 'PARTICIPANT' ? styles.active : ''}`}
                onClick={() => setActiveTab('PARTICIPANT')}
            >
                Kế hoạch tham gia ({participantPlans.length})
            </button>
        </div>

        {/* Grid List */}
        <div className={styles.planGrid}>
            {activeTab === 'OWNED' ? (ownedPlans.length > 0 ? (ownedPlans.map(plan => (
                    <PlanCard key={plan.id} plan={plan} onClick={() => setSelectedPlan(plan)}/>))) :
                <div className={styles.emptyState}>Chưa có kế hoạch nào được
                    tạo.</div>) : (participantPlans.length > 0 ? (participantPlans.map(plan => (
                    <PlanCard key={plan.id} plan={plan} onClick={() => setSelectedPlan(plan)}/>))) :
                <div className={styles.emptyState}>Chưa tham gia kế hoạch nào.</div>)}
        </div>

        {/* Modal */}
        {isCreatePlanModalOpen && (<CreatePlanModal
            unitId={unitId}
            onClose={() => setCreatePlanModalOpen(false)}
            onSuccess={handleCreatePlanSuccess}
        />)}
    </div>);
};

const PlanCard = ({plan, onClick}) => {
    return (<div className={styles.card} onClick={onClick}>
        <div className={styles.cardHeader}>
            <div className={styles.iconWrapper}>
                <FiFileText size={20}/>
            </div>
            <span className={styles.cardTitle} title={plan.name}>{plan.name}</span>
        </div>
        <div className={styles.cardBody}>
            <div className={styles.date}>
                <FiCalendar size={14}/> {plan.startMonth} - {plan.endMonth}
            </div>
            <div className={styles.status}>Đang thực hiện</div>
        </div>
    </div>);
};

// =============================================================================
// COMPONENT: Plan Detail View
// =============================================================================
const PlanDetailView = ({plan, unitId, onBack, isOwner}) => {
    const [groupedTasks, setGroupedTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    const monthRange = useMemo(() => getMonthRange(plan.startMonth, plan.endMonth), [plan]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const endpoint = isOwner ? `/task/plan/${plan.id}` : `/task/plan/${plan.id}/${unitId}`;

            const res = await axiosInstance.get(endpoint);
            const rawData = res.data || [];

            const allTasks = [];
            if (Array.isArray(rawData)) {
                rawData.forEach(group => {
                    if (group.tasks && Array.isArray(group.tasks)) {
                        allTasks.push(...group.tasks);
                    } else if (group.id && group.name && !group.tasks) {
                        allTasks.push(group);
                    }
                });
            }

            const map = new Map();
            allTasks.forEach(t => {
                const name = t.name;
                if (!map.has(name)) {
                    map.set(name, {name, records: []});
                }
                map.get(name).records.push(t);
            });

            setGroupedTasks(Array.from(map.values()));

        } catch (error) {
            console.error("Failed to load tasks", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [plan.id]);

    const handleCreateTaskSuccess = () => {
        fetchTasks();
        setIsTaskModalOpen(false);
    };

    return (<div className={styles.detailView}>
        <div className={styles.detailHeader}>
            <button className={styles.btnBack} onClick={onBack}>
                <FiArrowLeft size={24}/>
            </button>
            <div>
                <h2>{plan.name}</h2>
                <div style={{fontSize: 13, color: '#5f6368', marginTop: 4}}>
                    Thời gian: {plan.startMonth} đến {plan.endMonth}
                </div>
            </div>
        </div>

        <div className={styles.toolbar}>
            <h3>{isOwner ? "Quản lý Hạng mục công việc" : "Danh sách Hạng mục tham gia"}</h3>
            {isOwner && (<button
                className={styles.btnPrimary}
                style={{fontSize: 14, padding: '8px 16px'}}
                onClick={() => setIsTaskModalOpen(true)}
            >
                <FiPlus/> Thêm hạng mục
            </button>)}
        </div>

        {loading ? <div>Đang tải công việc...</div> : (<div style={{minHeight: 200}}>
            {groupedTasks.length === 0 ? (<div style={{
                padding: 40, textAlign: 'center', color: '#5f6368', border: '1px dashed #dadce0', borderRadius: 8
            }}>
                Chưa có hạng mục công việc nào.
            </div>) : (groupedTasks.map((group, index) => (<TaskNameRow
                key={index}
                taskGroup={group}
                monthRange={monthRange}
                isParticipant={!isOwner}
                currentUnitId={unitId}
                plan={plan}
            />)))}
        </div>)}

        {isTaskModalOpen && (<CreateTaskModal
            plan={plan}
            unitId={unitId}
            onClose={() => setIsTaskModalOpen(false)}
            onSuccess={handleCreateTaskSuccess}
        />)}
    </div>);
};

// =============================================================================
// COMPONENT: Task Name Row (Grid vs List)
// =============================================================================
const TaskNameRow = ({taskGroup, monthRange, isParticipant, currentUnitId, plan}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Grid View Logic (Owner)
    const gridRows = useMemo(() => {
        if (isParticipant) return [];
        const rowMap = new Map();
        taskGroup.records.forEach(task => {
            let key, name, type;
            if (task.executors && task.executors.length > 0) {
                const staffIds = task.executors.map(e => e.id).sort().join("_");
                key = `STAFF_${staffIds}`;
                name = task.executors.map(e => e.name).join(", ");
                type = "STAFF";
            } else {
                key = task.assignee ? `UNIT_${task.assignee.id}` : "UNKNOWN";
                name = task.assignee ? task.assignee.name : "Chưa phân công";
                type = task.assignee ? "UNIT" : "UNKNOWN";
            }
            if (!rowMap.has(key)) rowMap.set(key, {key, name, type, tasks: []});
            rowMap.get(key).tasks.push(task);
        });
        return Array.from(rowMap.values());
    }, [taskGroup, isParticipant]);

    // List View Logic (Participant)
    const monthRows = useMemo(() => {
        if (!isParticipant) return [];
        return [...taskGroup.records].sort((a, b) => a.month.localeCompare(b.month));
    }, [taskGroup, isParticipant]);

    return (<div className={`${styles.taskNameRow} ${isExpanded ? styles.expanded : ''}`}>
        <div className={styles.rowHeader} onClick={() => setIsExpanded(!isExpanded)}>
            <div className={styles.taskTitle}>
                <FiLayers color="#1a73e8"/>
                {taskGroup.name}
            </div>
            <div className={`${styles.chevron} ${isExpanded ? styles.rotate : ''}`}>
                <FiChevronDown size={20}/>
            </div>
        </div>

        {isExpanded && (<div className={styles.expandedContent}>
            {isParticipant ? (<div className={styles.gridTableWrapper}>
                <table className={styles.monthListTable}>
                    <thead>
                    <tr>
                        <th style={{width: 140}}>Tháng</th>
                        <th>Phân công</th>
                        <th style={{width: 150}}>Trạng thái</th>
                        <th style={{width: 150}}>Tiến độ</th>
                    </tr>
                    </thead>
                    <tbody>
                    {monthRows.map(task => (<MonthRow
                        key={task.id}
                        task={task}
                        taskGroup={taskGroup}
                        currentUnitId={currentUnitId}
                        plan={plan}
                    />))}
                    {monthRows.length === 0 && <tr>
                        <td colSpan={4} className={styles.emptyText}>Chưa có nhiệm vụ chi tiết.</td>
                    </tr>}
                    </tbody>
                </table>
            </div>) : (<div className={styles.gridTableWrapper}>
                <table className={styles.gridTable}>
                    <thead>
                    <tr>
                        <th>Người / Đơn vị thực hiện</th>
                        {monthRange.map(m => (<th key={m}>{m}</th>))}
                    </tr>
                    </thead>
                    <tbody>
                    {gridRows.map(row => (<tr key={row.key}>
                        <td>
                            {row.type === 'UNIT' ? <FaBuilding color="#5f6368"/> : <FaUserCircle color="#5f6368"/>}
                            {row.name}
                        </td>
                        {monthRange.map(m => {
                            const active = row.tasks.some(t => t.month === m);
                            return (<td key={m} className={active ? styles.activeCell : ''}>
                                {active && <FiCheck size={16}/>}
                            </td>);
                        })}
                    </tr>))}
                    {gridRows.length === 0 && (<tr>
                        <td colSpan={monthRange.length + 1} className={styles.emptyText}>
                            Chưa có người thực hiện nào được giao.
                        </td>
                    </tr>)}
                    </tbody>
                </table>
            </div>)}
        </div>)}
    </div>);
};

// =============================================================================
// COMPONENT: Month Row
// =============================================================================
const MonthRow = ({task, taskGroup, currentUnitId, plan}) => {
    const [isRowExpanded, setIsRowExpanded] = useState(false);

    // Check sơ bộ xem đã phân công chưa
    const isAssigned = (task.executors && task.executors.length > 0) || (task.assignee?.id !== parseInt(currentUnitId));

    const getStatusClass = (status) => {
        if (status === 'COMPLETED') return styles.completed;
        if (status === 'IN_PROGRESS') return styles.progress;
        return styles.pending;
    };

    return (<React.Fragment>
        <tr
            className={`${styles.clickableRow} ${isRowExpanded ? styles.expandedRow : ''}`}
            onClick={() => setIsRowExpanded(!isRowExpanded)}
        >
            <td>{task.month}</td>
            <td>
                {isAssigned ? <span className={styles.tagAssigned}>Đã phân công</span> :
                    <span className={styles.tagUnassigned}>Chưa phân công</span>}
            </td>
            <td>
                    <span className={`${styles.statusBadge} ${getStatusClass(task.status)}`}>
                        {task.status === 'COMPLETED' ? "Hoàn thành" : task.status === 'IN_PROGRESS' ? "Đang thực hiện" : "Chờ xử lý"}
                    </span>
            </td>
            <td>
                <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{width: `${task.progress || 0}%`}}></div>
                </div>
                <span style={{fontSize: 11, color: '#666'}}>{task.progress || 0}%</span>
            </td>
        </tr>
        {isRowExpanded && (<tr>
            <td colSpan={4} style={{padding: 0, borderBottom: '1px solid #dadce0'}}>
                <TaskDetailTabs
                    task={task}
                    taskGroup={taskGroup}
                    currentUnitId={currentUnitId}
                    plan={plan}
                />
            </td>
        </tr>)}
    </React.Fragment>);
};

// =============================================================================
// COMPONENT: Chat Box
// =============================================================================
const CommentBox = ({taskId, currentUserId}) => {
    const [comments, setComments] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const fetchComments = async () => {
        try {
            const res = await axiosInstance.get(`/task/${taskId}/comments`);
            setComments(res.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [taskId]);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, [comments]);

    const handleSend = async () => {
        if (!message.trim()) return;
        setLoading(true);
        try {
            await axiosInstance.post('/task/comment', {taskId: taskId, message: message, owner: {id: 1}});
            setMessage("");
            fetchComments();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (<div className={styles.chatContainer}>
        <div className={styles.messagesArea}>
            {comments.length === 0 ?
                <div className={styles.emptyChat}>Chưa có thảo luận nào.</div> : comments.map((c, i) => (
                    <div key={i} className={`${styles.messageRow} ${c.owner?.id === 1 ? styles.msgSelf : ''}`}>
                        <div className={styles.msgAvatar}>{c.owner?.name?.charAt(0)}</div>
                        <div className={styles.msgContent}>
                            <div className={styles.msgHeader}><span>{c.owner?.name}</span><span>{c.timestamp}</span>
                            </div>
                            <div className={styles.msgBody}>{c.message}</div>
                        </div>
                    </div>))}
            <div ref={messagesEndRef}/>
        </div>
        <div className={styles.inputArea}>
            <input type="text" value={message} onChange={e => setMessage(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Nhập tin nhắn..."/>
            <button onClick={handleSend} disabled={loading || !message.trim()}><FiSend/></button>
        </div>
    </div>);
};

// =============================================================================
// COMPONENT: Task Detail Tabs (ASSIGN, DISCUSS, HISTORY)
// =============================================================================
const TaskDetailTabs = ({task, taskGroup, currentUnitId, plan}) => {
    const [activeTab, setActiveTab] = useState('ASSIGN');

    // Assign Logic
    const [subUnits, setSubUnits] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loadingResources, setLoadingResources] = useState(true);
    const [selectedAssignees, setSelectedAssignees] = useState([]);
    const [applyToAll, setApplyToAll] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Data State
    const [childTasks, setChildTasks] = useState([]);
    const [taskHistory, setTaskHistory] = useState([]);
    const [actions, setActions] = useState([]);

    // Action Create State
    const [isCreateActionOpen, setCreateActionOpen] = useState(false);

    // --- Helper to fetch Actions (FIX 1: Extracted for reload) ---
    const fetchActions = async () => {
        try {
            const res = await axiosInstance.get(`/task/${task.id}/actions`);
            setActions(res.data || []);
        } catch (e) {
            setActions([]);
        }
    };

    useEffect(() => {
        const initData = async () => {
            setLoadingResources(true);
            try {
                // Task details (children)
                const taskRes = await axiosInstance.get(`/task/${task.id}`);
                setChildTasks(taskRes.data.children || []);

                // Load Actions
                fetchActions();

                // Resources
                const [subRes, staffRes] = await Promise.all([axiosInstance.get(`/unit/${currentUnitId}/children`), axiosInstance.get(`/unit/${currentUnitId}/staff`)]);
                setSubUnits(subRes.data || []);
                setStaffList(staffRes.data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingResources(false);
            }
        };
        initData();
    }, [task.id, currentUnitId]);

    // Fetch History when tab active
    useEffect(() => {
        if (activeTab === 'HISTORY') {
            axiosInstance.get(`/task/${task.id}/history`).then(res => setTaskHistory(res.data || [])).catch(console.error);
        }
    }, [activeTab, task.id]);

    const isUnitMode = subUnits.length > 0;
    const hasBeenAssigned = childTasks.length > 0 || (task.executors?.length > 0 && task.assignee?.id === parseInt(currentUnitId));

    const toggleItem = (list, setList, item) => setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);

    const handleAssignSubmit = async () => {
        if (selectedAssignees.length === 0) return alert("Vui lòng chọn đối tượng giao việc.");
        try {
            const tasksToAssign = applyToAll ? taskGroup.records : [task];
            const requests = [];
            tasksToAssign.forEach(t => {
                if (isUnitMode) {
                    selectedAssignees.forEach(subId => {
                        requests.push(axiosInstance.post('/task', {
                            name: `Triển khai: ${t.name}`,
                            month: t.month,
                            plan: {id: plan.id},
                            assigner: {id: currentUnitId},
                            assignee: {id: subId},
                            parentTask: {id: t.id},
                            executors: []
                        }));
                    });
                } else {
                    requests.push(axiosInstance.post('/task', {
                        name: `Triển khai: ${t.name}`,
                        month: t.month,
                        plan: {id: plan.id},
                        assigner: {id: currentUnitId},
                        assignee: {id: currentUnitId},
                        parentTask: {id: t.id},
                        executors: selectedAssignees.map(id => ({id}))
                    }));
                }
            });
            await Promise.all(requests);
            alert("Giao việc thành công!");
            const res = await axiosInstance.get(`/task/${task.id}`);
            setChildTasks(res.data.children || []);
            setSelectedAssignees([]);
            setIsEditing(false);
        } catch (e) {
            alert("Lỗi khi giao việc.");
        }
    };

    // FIX 1: Reload actions on success
    const handleActionCreateSuccess = () => {
        setCreateActionOpen(false);
        fetchActions(); // Load lại data
    };

    return (<div className={styles.nestedDetailContainer}>
        <div className={styles.nestedTabs}>
            <button className={activeTab === 'ASSIGN' ? styles.active : ''} onClick={() => setActiveTab('ASSIGN')}>
                <FiUserCheck size={14} style={{marginRight: 6}}/> Phân công
            </button>
            <button className={activeTab === 'DISCUSS' ? styles.active : ''}
                    onClick={() => setActiveTab('DISCUSS')}>
                <FiMessageSquare size={14} style={{marginRight: 6}}/> Thảo luận
            </button>
            <button className={activeTab === 'HISTORY' ? styles.active : ''}
                    onClick={() => setActiveTab('HISTORY')}>
                <FiClock size={14} style={{marginRight: 6}}/> Lịch sử
            </button>
        </div>

        <div className={styles.tabContent}>
            {/* 1. ASSIGN TAB */}
            {activeTab === 'ASSIGN' && (<div className={styles.assignPanel}>
                <div className={styles.sectionBox}>
                    {hasBeenAssigned && !isEditing ? (<div>
                        <div  className={styles.panelHeader}>
                            <div className={styles.currentAssign}><FiCheck/> Đã phân công cho:</div>&nbsp;<div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                                {childTasks.map(child => (<div key={child.id} className={styles.chip} style={{
                                    cursor: 'default', background: '#e6f4ea', borderColor: '#137333'
                                }}>
                                    {child.assignee && child.assignee.id !== parseInt(currentUnitId) ? <>
                                        <FaBuilding style={{marginRight: 4}}/> {child.assignee.name}</> : <>
                                        <FiUsers
                                            style={{marginRight: 4}}/> {child.executors?.map(e => e.name).join(', ')}</>}
                                </div>))}
                                {task.executors?.map(e => (<div key={e.id} className={styles.chip} style={{
                                    cursor: 'default', background: '#e6f4ea', borderColor: '#137333'
                                }}>
                                    <FaUserCircle style={{marginRight: 4}}/> {e.name}
                                </div>))}
                            </div>
                            <button className={styles.btnEdit} onClick={() => setIsEditing(true)}><FiEdit2
                                style={{marginRight: 4}}/> Chỉnh sửa
                            </button>
                        </div>
                    </div>) : (<div className={styles.assignForm}>
                        <div className={styles.panelHeader}>
                            <div style={{
                                fontSize: 14, color: '#5f6368'
                            }}>{isUnitMode ? "Chọn Đơn vị trực thuộc:" : "Chọn Nhân viên:"}</div>
                            {hasBeenAssigned && isEditing &&
                                <button className={styles.btnEdit} style={{color: '#ea4335'}}
                                        onClick={() => setIsEditing(false)}>Hủy</button>}
                        </div>
                        {loadingResources ? <div className={styles.emptyText}>Loading...</div> : (
                            <div className={styles.checkboxGroup}>
                                {isUnitMode ? subUnits.map(u => (<div key={u.id}
                                                                      className={`${styles.chip} ${selectedAssignees.includes(u.id) ? styles.active : ''}`}
                                                                      onClick={() => toggleItem(selectedAssignees, setSelectedAssignees, u.id)}>
                                    <FaBuilding style={{marginRight: 4}}/> {u.name}
                                </div>)) : staffList.map(s => (<div key={s.id}
                                                                    className={`${styles.chip} ${selectedAssignees.includes(s.id) ? styles.active : ''}`}
                                                                    onClick={() => toggleItem(selectedAssignees, setSelectedAssignees, s.id)}>
                                    <FaUserCircle style={{marginRight: 4}}/> {s.name}</div>))}
                            </div>)}
                        <label className={styles.applyAll}><input type="checkbox" checked={applyToAll}
                                                                  onChange={e => setApplyToAll(e.target.checked)}/> Áp
                            dụng cho tất cả các tháng</label>
                        <div className={styles.formButtons}>
                            <button className={styles.btnAssign}
                                    onClick={isEditing ? () => alert("Update UI only") : handleAssignSubmit}>{isEditing ? "Cập nhật" : "Lưu phân công"}</button>
                        </div>
                    </div>)}
                </div>

                {/* Action Section (Leaf Unit only) */}
                {!isUnitMode && (<div className={styles.sectionBox}>
                    <div className={styles.panelHeader}>
                        <h4><FiList/> Hành động cụ thể</h4>
                        <button className={styles.btnPrimary} style={{padding: '6px 12px', fontSize: 12}}
                                onClick={() => setCreateActionOpen(true)}>
                            <FiPlus/> Thêm hành động
                        </button>
                    </div>
                    {actions.length === 0 ? <div className={styles.emptyText}>Chưa có hành động nào.</div> : (
                        <table className={styles.actionTable}>
                            <thead>
                            <tr>
                                <th>Tên hành động</th>
                                <th>Người làm</th>
                                <th>Trạng thái</th>
                            </tr>
                            </thead>
                            <tbody>
                            {actions.map(act => (<tr key={act.id}>
                                <td>
                                    <div style={{fontWeight: 500}}>{act.name}</div>
                                    <div style={{
                                        fontSize: 12, color: '#666'
                                    }}>{act.description}</div>
                                </td>
                                <td>{act.executor?.name || "Chưa gán"}</td>
                                <td><span
                                    className={`${styles.statusBadge} ${act.status === 'DONE' ? styles.completed : styles.pending}`}>{act.status}</span>
                                </td>
                            </tr>))}
                            </tbody>
                        </table>)}
                </div>)}
            </div>)}

            {/* 2. DISCUSS TAB */}
            {activeTab === 'DISCUSS' && <CommentBox taskId={task.id} currentUserId={1}/>}

            {/* 3. HISTORY TAB */}
            {activeTab === 'HISTORY' && (<div style={{
                maxHeight: 250,
                overflowY: 'auto',
                background: 'white',
                borderRadius: 8,
                border: '1px solid #dadce0',
                padding: 16
            }}>
                {taskHistory.length === 0 ? <div className={styles.emptyText}>Chưa có lịch sử.</div> : (
                    <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                        {taskHistory.map((h, i) => (<li key={i} style={{
                            marginBottom: 12,
                            borderBottom: '1px solid #f1f1f1',
                            paddingBottom: 8,
                            display: 'flex',
                            gap: 12
                        }}>
                            <div style={{
                                width: 30,
                                height: 30,
                                background: '#f1f3f4',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}><FiActivity size={14}/></div>
                            <div>
                                <div style={{fontSize: 13, fontWeight: 500}}>{h.name} <span
                                    style={{fontWeight: 400, color: '#666'}}>updated</span></div>
                                <div style={{fontSize: 12, color: '#666'}}>Status: {h.nextStatus}</div>
                                <div style={{fontSize: 11, color: '#999'}}>{h.timestamp}</div>
                            </div>
                        </li>))}
                    </ul>)}
            </div>)}
        </div>

        {/* Modal Create Action */}
        {isCreateActionOpen && (<CreateActionModal
            taskId={task.id}
            staffList={staffList}
            onClose={() => setCreateActionOpen(false)}
            onSuccess={handleActionCreateSuccess}
        />)}
    </div>);
};

// =============================================================================
// MODAL: Create Action
// =============================================================================
const CreateActionModal = ({taskId, staffList, onClose, onSuccess}) => {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [executorId, setExecutorId] = useState('');

    const handleSubmit = async () => {
        if (!name || !executorId) return alert("Điền tên và chọn người làm.");
        try {
            await axiosInstance.post('/task/action', {
                taskId: taskId, name: name, description: desc, executor: {id: executorId}
            });
            onSuccess();
        } catch (e) {
            alert("Lỗi tạo action");
        }
    };

    return (<div className={styles.modalOverlay}>
        <div className={styles.modalContent} style={{width: 450}}>
            <h3>Tạo hành động mới</h3>
            <div className={styles.formGroup}>
                <label>Tên hành động</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                       placeholder="VD: Khảo sát..."/>
            </div>
            <div className={styles.formGroup}>
                <label>Mô tả</label>
                <input type="text" value={desc} onChange={e => setDesc(e.target.value)}/>
            </div>
            <div className={styles.formGroup}>
                <label>Người thực hiện</label>
                <select value={executorId} onChange={e => setExecutorId(e.target.value)}>
                    <option value="">-- Chọn nhân viên --</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div className={styles.modalActions}>
                <button className={styles.btnCancel} onClick={onClose}>Hủy</button>
                <button className={styles.btnSubmit} onClick={handleSubmit}>Tạo</button>
            </div>
        </div>
    </div>);
};

// =============================================================================
// MODALS (Plan / Task)
// =============================================================================
const CreatePlanModal = ({unitId, onClose, onSuccess}) => {
    const [name, setName] = useState('');
    const [startMonth, setStartMonth] = useState('');
    const [endMonth, setEndMonth] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async () => {
        if (!name || !startMonth || !endMonth) return alert("Thiếu thông tin");
        setLoading(true);
        try {
            const res = await axiosInstance.post('/plan', {name, startMonth, endMonth, unit: {id: unitId}});
            onSuccess(res.data);
        } catch (e) {
            alert("Lỗi");
        } finally {
            setLoading(false);
        }
    };
    return (<div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
            <h3>Tạo Kế hoạch</h3>
            <div className={styles.formGroup}><input placeholder="Tên kế hoạch" value={name}
                                                     onChange={e => setName(e.target.value)}/></div>
            <div className={styles.formGroup}><input type="month" value={startMonth}
                                                     onChange={e => setStartMonth(e.target.value)}/></div>
            <div className={styles.formGroup}><input type="month" value={endMonth}
                                                     onChange={e => setEndMonth(e.target.value)}/></div>
            <div className={styles.modalActions}>
                <button onClick={onClose}>Hủy</button>
                <button className={styles.btnSubmit} onClick={handleSubmit} disabled={loading}>Lưu</button>
            </div>
        </div>
    </div>);
};

const CreateTaskModal = ({plan, unitId, onClose, onSuccess}) => {
    const [taskName, setTaskName] = useState('');
    const [selectedMonths, setSelectedMonths] = useState([]);
    const [subUnits, setSubUnits] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [selectedAssignees, setSelectedAssignees] = useState([]);
    const [loadingResources, setLoadingResources] = useState(true);

    useEffect(() => {
        const fetchRes = async () => {
            setLoadingResources(true);
            try {
                const [subRes, staffRes] = await Promise.all([axiosInstance.get(`/unit/${unitId}/children`), axiosInstance.get(`/unit/${unitId}/staff`)]);
                setSubUnits(subRes.data || []);
                setStaffList(staffRes.data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingResources(false);
            }
        };
        fetchRes();
    }, [unitId]);

    const isUnitMode = subUnits.length > 0;
    const months = useMemo(() => getMonthRange(plan.startMonth, plan.endMonth), [plan]);
    const toggleItem = (list, setList, item) => setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);

    const handleSubmit = async () => {
        if (!taskName || selectedMonths.length === 0 || selectedAssignees.length === 0) return alert("Thiếu thông tin");
        try {
            const reqs = [];
            for (const m of selectedMonths) {
                if (isUnitMode) selectedAssignees.forEach(id => reqs.push(axiosInstance.post('/task', {
                    name: taskName, month: m, plan: {id: plan.id}, assigner: {id: unitId}, assignee: {id}, executors: []
                }))); else reqs.push(axiosInstance.post('/task', {
                    name: taskName,
                    month: m,
                    plan: {id: plan.id},
                    assigner: {id: unitId},
                    assignee: {id: unitId},
                    executors: selectedAssignees.map(id => ({id}))
                }));
            }
            await Promise.all(reqs);
            onSuccess();
        } catch (e) {
            alert("Lỗi");
        }
    };

    return (<div className={styles.modalOverlay}>
        <div className={styles.modalContent} style={{width: 600}}>
            <h3>Thêm Hạng mục</h3>
            <div className={styles.formGroup}><input placeholder="Tên hạng mục" value={taskName}
                                                     onChange={e => setTaskName(e.target.value)}/></div>
            <div className={styles.checkboxGroup}>
                {isUnitMode ? subUnits.map(u => <div key={u.id}
                                                     className={`${styles.chip} ${selectedAssignees.includes(u.id) ? styles.active : ''}`}
                                                     onClick={() => toggleItem(selectedAssignees, setSelectedAssignees, u.id)}>{u.name}</div>) : staffList.map(s =>
                    <div key={s.id}
                         className={`${styles.chip} ${selectedAssignees.includes(s.id) ? styles.active : ''}`}
                         onClick={() => toggleItem(selectedAssignees, setSelectedAssignees, s.id)}>{s.name}</div>)}
            </div>
            <div className={styles.checkboxGroup}>{months.map(m => <div key={m}
                                                                        className={`${styles.chip} ${selectedMonths.includes(m) ? styles.active : ''}`}
                                                                        onClick={() => toggleItem(selectedMonths, setSelectedMonths, m)}>{m}</div>)}</div>
            <div className={styles.modalActions}>
                <button onClick={onClose}>Hủy</button>
                <button className={styles.btnSubmit} onClick={handleSubmit}>Tạo</button>
            </div>
        </div>
    </div>);
};

export default PageDepartment;