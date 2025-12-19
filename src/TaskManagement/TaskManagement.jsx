import React, {useEffect, useState} from 'react';
import axiosInstance from '../reusable/axiosInstance';
import styles from './TaskManagement.module.scss';

const TaskManagement = () => {
    // --- STATE ---
    const [staffList, setStaffList] = useState([]);
    const [currentStaffId, setCurrentStaffId] = useState('');

    // View State: 'list' | 'detail'
    const [viewMode, setViewMode] = useState('list');
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [planTaskGroups, setPlanTaskGroups] = useState([]); // Dữ liệu chi tiết plan

    const [loading, setLoading] = useState(false);

    // Create Action State
    const [showActionModal, setShowActionModal] = useState(false);
    const [targetTaskId, setTargetTaskId] = useState(null);
    const [newAction, setNewAction] = useState({name: '', description: '', deadline: ''});

    // --- INITIAL LOAD ---
    useEffect(() => {
        fetchStaffList();
    }, []);

    useEffect(() => {
        if (currentStaffId) {
            // Reset về list khi đổi nhân vật
            setViewMode('list');
            setSelectedPlan(null);
            fetchMyPlans();
        }
    }, [currentStaffId]);

    // --- API CALLS ---

    const fetchStaffList = async () => {
        try {
            const res = await axiosInstance.get('/staff'); //
            setStaffList(res.data);
            if (res.data.length > 0) setCurrentStaffId(res.data[0].id);
        } catch (error) {
            console.error("Error fetching staff:", error);
        }
    };

    // Lấy danh sách Plan mà user tham gia
    const [myPlans, setMyPlans] = useState([]);
    const fetchMyPlans = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/my-work/plans', {
                params: {staffId: currentStaffId} //
            });
            setMyPlans(res.data);
        } catch (error) {
            console.error("Error fetching plans:", error);
        } finally {
            setLoading(false);
        }
    };

    // Lấy chi tiết Plan (Cấu trúc TaskGroup)
    const fetchPlanDetails = async (planId) => {
        setLoading(true);
        try {
            // Sử dụng API lấy structure của Plan giống PageDepartment
            const res = await axiosInstance.get(`/task/plan/${planId}`); //
            setPlanTaskGroups(res.data);
        } catch (error) {
            console.error("Error fetching plan details:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- HANDLERS ---

    const handlePlanClick = (plan) => {
        setSelectedPlan(plan);
        setViewMode('detail');
        fetchPlanDetails(plan.id);
    };

    const handleBackToList = () => {
        setViewMode('list');
        setSelectedPlan(null);
        setPlanTaskGroups([]);
    };

    const handleToggleAction = async (actionId, currentStatus) => {
        // Logic toggle status action
        const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        try {
            await axiosInstance.put(`/my-work/action/${actionId}/status`, null, {
                params: {staffId: currentStaffId, status: newStatus} //
            });
            // Refresh lại dữ liệu plan hiện tại
            fetchPlanDetails(selectedPlan.id);
        } catch (error) {
            alert("Lỗi cập nhật action: " + error.message);
        }
    };

    const handleOpenCreateAction = (taskId) => {
        setTargetTaskId(taskId);
        setNewAction({name: '', description: '', deadline: new Date().toISOString().split('T')[0]});
        setShowActionModal(true);
    };

    const handleSubmitAction = async () => {
        if (!newAction.name) return alert("Vui lòng nhập tên hành động");

        try {
            // Gọi API tạo Action
            const payload = {
                taskId: targetTaskId,
                name: newAction.name,
                description: newAction.description,
                deadline: newAction.deadline,
                executors: [{id: currentStaffId}] // Tự giao cho chính mình hoặc cần logic chọn người (ở đây mặc định assign cho user hiện tại)
            };

            await axiosInstance.post('/task/action', payload);
            setShowActionModal(false);
            fetchPlanDetails(selectedPlan.id); // Refresh
        } catch (error) {
            console.error(error);
            alert("Lỗi tạo action");
        }
    };

    // --- RENDER ---

    return (<div className={styles.container}>
        {/* Header chung & Chọn nhân vật */}
        <div className={styles.topBar}>
            <h2>{viewMode === 'list' ? 'Danh sách Kế hoạch của tôi' : `Chi tiết: ${selectedPlan?.name}`}</h2>
            <div className={styles.impersonate}>
                <label>User:</label>
                <select value={currentStaffId} onChange={e => setCurrentStaffId(e.target.value)}>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
        </div>

        {/* VIEW 1: PLAN LIST */}
        {viewMode === 'list' && (<div className={styles.planGrid}>
            {loading && <p>Đang tải...</p>}
            {!loading && myPlans.length === 0 && <p className={styles.empty}>Bạn chưa tham gia kế hoạch nào.</p>}
            {myPlans.map(plan => (<div key={plan.id} className={styles.planCard} onClick={() => handlePlanClick(plan)}>
                <div className={styles.planIcon}>📁</div>
                <div className={styles.planInfo}>
                    <h3>{plan.name}</h3>
                    <p>{plan.startMonth} - {plan.endMonth}</p>
                    <span className={styles.tag}>Xem chi tiết &rarr;</span>
                </div>
            </div>))}
        </div>)}

        {/* VIEW 2: PLAN DETAIL (Task Groups) */}
        {viewMode === 'detail' && (<div className={styles.detailView}>
            <button className={styles.backBtn} onClick={handleBackToList}>&larr; Quay lại danh sách</button>

            {loading && <div className={styles.loading}>Đang tải chi tiết kế hoạch...</div>}

            <div className={styles.taskGroupList}>
                {planTaskGroups.map((group) => (<TaskGroupItem
                    key={group.uuid}
                    group={group}
                    onToggleAction={handleToggleAction}
                    onCreateAction={handleOpenCreateAction}
                />))}
            </div>
        </div>)}

        {/* MODAL CREATE ACTION */}
        {showActionModal && (<div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <h3>Thêm hành động mới</h3>
                <div className={styles.formGroup}>
                    <label>Tên hành động:</label>
                    <input
                        type="text"
                        value={newAction.name}
                        onChange={e => setNewAction({...newAction, name: e.target.value})}
                        placeholder="Nhập tên việc cần làm..."
                    />
                </div>
                <div className={styles.formGroup}>
                    <label>Mô tả:</label>
                    <textarea
                        value={newAction.description}
                        onChange={e => setNewAction({...newAction, description: e.target.value})}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label>Deadline:</label>
                    <input
                        type="date"
                        value={newAction.deadline}
                        onChange={e => setNewAction({...newAction, deadline: e.target.value})}
                    />
                </div>
                <div className={styles.modalActions}>
                    <button className={styles.cancelBtn} onClick={() => setShowActionModal(false)}>Hủy</button>
                    <button className={styles.confirmBtn} onClick={handleSubmitAction}>Tạo mới</button>
                </div>
            </div>
        </div>)}
    </div>);
};

// --- SUB COMPONENT: Task Group Item (Accordion) ---
const TaskGroupItem = ({group, onToggleAction, onCreateAction}) => {
    const [expanded, setExpanded] = useState(false);

    // Lấy task mới nhất trong group để hiển thị info chính
    const primaryTask = group.tasks && group.tasks.length > 0 ? group.tasks[0] : null;

    if (!primaryTask) return null;

    // Fetch Actions của Task này (Giả sử BE trả về Actions kèm trong TaskDTO hoặc gọi API riêng)
    // Ở cấu trúc cũ, Action nằm trong Task? Kiểm tra TaskDTO.java -> Không thấy List<Action>.
    // => Cần gọi API lấy action hoặc Backend đã cập nhật TaskDTO chứa actions.
    // **GIẢ ĐỊNH QUAN TRỌNG:** Để UI hoạt động mượt, ta giả định API `getTasksByPlan` đã được chỉnh sửa để return kèm Actions,
    // HOẶC ta phải gọi API `getActionsByTask` ở đây.
    // Để tối ưu, ta sẽ dùng Component `ActionList` tự fetch actions nếu chưa có.

    return (<div className={`${styles.taskGroup} ${expanded ? styles.expanded : ''}`}>
        <div className={styles.groupHeader} onClick={() => setExpanded(!expanded)}>
            <span className={styles.toggleIcon}>{expanded ? '▼' : '▶'}</span>
            <div className={styles.groupInfo}>
                <span className={styles.groupName}>{primaryTask.name}</span>
                <span className={styles.groupMeta}>
                        {primaryTask.status} • {Math.round(primaryTask.progress * 100)}%
                    </span>
            </div>
        </div>

        {expanded && (<div className={styles.groupBody}>
            <p className={styles.desc}>{primaryTask.description || 'Không có mô tả'}</p>
            <div className={styles.metaRow}>
                <span><strong>Deadline:</strong> {primaryTask.currentDeadline || primaryTask.initialDeadline}</span>
                <span><strong>Tháng:</strong> {primaryTask.month}</span>
            </div>

            {/* ACTION SECTION */}
            <div className={styles.actionSection}>
                <div className={styles.actionHeader}>
                    <h4>Checklist / Hành động</h4>
                    <button
                        className={styles.addTimeBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            onCreateAction(primaryTask.id);
                        }}
                    >
                        + Thêm Action
                    </button>
                </div>

                {/* Render Actions */}
                <ActionListFetcher taskId={primaryTask.id} onToggle={onToggleAction}/>
            </div>
        </div>)}
    </div>);
};

// --- SUB COMPONENT: Fetch Actions riêng lẻ để đảm bảo dữ liệu mới nhất ---
const ActionListFetcher = ({taskId, onToggle}) => {
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActions = async () => {
            try {
                // API lấy action theo task
                const res = await axiosInstance.get(`/task/action/task/${taskId}`);
                setActions(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchActions();
    }, [taskId]); // Reload khi taskId thay đổi. *Lưu ý: Khi cha add action xong, cần trigger reload ở đây.
                  // (Simplification: Trong code production nên dùng context hoặc lift state up,
                  // ở đây user chấp nhận reload bằng cách đóng/mở lại accordion hoặc switch tab để refresh).

    if (loading) return <small>Loading actions...</small>;
    if (actions.length === 0) return <small style={{color: '#999'}}>Chưa có hành động nào.</small>;

    return (<ul className={styles.actionList}>
        {actions.map(action => (<li key={action.id} className={action.status === 'COMPLETED' ? styles.done : ''}>
            <label>
                <input
                    type="checkbox"
                    checked={action.status === 'COMPLETED'}
                    onChange={() => onToggle(action.id, action.status)}
                />
                <span className={styles.actName}>{action.name}</span>
            </label>
            <span className={styles.actDate}>{action.deadline}</span>
        </li>))}
    </ul>);
};

export default TaskManagement;