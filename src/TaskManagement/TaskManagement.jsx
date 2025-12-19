import React, { useEffect, useState, useRef } from 'react';
import axiosInstance from '../reusable/axiosInstance';
import styles from './TaskManagement.module.scss';

// ==========================================
// CONSTANTS & UTILS
// ==========================================
const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Chưa làm', color: '#ff9800', bg: '#fff3e0' },
    { value: 'IN_PROGRESS', label: 'Đang làm', color: '#2196f3', bg: '#e3f2fd' },
    { value: 'COMPLETED', label: 'Hoàn thành', color: '#4caf50', bg: '#e8f5e9' },
    { value: 'COMPLETED', label: 'Rút lại lời hứa', color: '#af4c4c', bg: '#e8f5e9' }
];

// Helper lấy option hiện tại
const getStatusOption = (status) => {
    return STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
};

// ==========================================
// REUSABLE COMPONENT: RADIO DROPDOWN
// ==========================================
const RadioDropdown = ({ value, onChange, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    const currentOption = getStatusOption(value);

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (opt) => {
        if (opt.value !== value) {
            onChange(opt.value);
        }
        setIsOpen(false);
    };

    return (
        <div className={styles.radioDropdown} ref={wrapperRef}>
            {/* TRIGGER BUTTON (Hiển thị như một Badge) */}
            <div
                className={`${styles.trigger} ${disabled ? styles.disabled : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    color: currentOption.color,
                    backgroundColor: currentOption.bg,
                    borderColor: currentOption.color
                }}
            >
                <span className={styles.label}>{currentOption.label}</span>
                <span className={styles.arrow}>▼</span>
            </div>

            {/* DROPDOWN MENU */}
            {isOpen && (
                <div className={styles.dropdownMenu}>
                    {STATUS_OPTIONS.map(opt => (
                        <div
                            key={opt.value}
                            className={`${styles.dropdownItem} ${opt.value === value ? styles.selected : ''}`}
                            onClick={() => handleSelect(opt)}
                        >
                            <span
                                className={styles.dot}
                                style={{ backgroundColor: opt.color }}
                            ></span>
                            <span className={styles.itemLabel}>{opt.label}</span>
                            {opt.value === value && <span className={styles.check}>✓</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ==========================================
// MAIN COMPONENT
// ==========================================
const TaskManagement = () => {
    // --- STATE ---
    const [staffList, setStaffList] = useState([]);
    const [currentStaffId, setCurrentStaffId] = useState('');

    // View Mode
    const [viewMode, setViewMode] = useState('list');
    const [selectedPlan, setSelectedPlan] = useState(null);

    // Data
    const [myPlans, setMyPlans] = useState([]);
    const [loading, setLoading] = useState(false);

    // --- INITIAL LOAD ---
    useEffect(() => {
        fetchStaffList();
    }, []);

    useEffect(() => {
        if (currentStaffId) {
            setViewMode('list');
            setSelectedPlan(null);
            fetchMyPlans();
        }
    }, [currentStaffId]);

    // --- API CALLS ---
    const fetchStaffList = async () => {
        try {
            const res = await axiosInstance.get('/staff');
            setStaffList(res.data);
            if (res.data.length > 0) setCurrentStaffId(res.data[0].id);
        } catch (error) {
            console.error("Error loading staff:", error);
        }
    };

    const fetchMyPlans = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/my-work/plans', {
                params: { staffId: currentStaffId }
            });
            setMyPlans(res.data);
        } catch (error) {
            console.error("Error loading plans:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- HANDLERS ---
    const handlePlanClick = (plan) => {
        setSelectedPlan(plan);
        setViewMode('detail');
    };

    const handleBack = () => {
        setViewMode('list');
        setSelectedPlan(null);
    };

    // --- RENDER ---
    return (
        <div className={styles.container}>
            {/* HEADER */}
            <header className={styles.topBar}>
                <div className={styles.titles}>
                    <h1>Quản lý Công việc</h1>
                    <p className={styles.subTitle}>
                        {viewMode === 'list'
                            ? 'Danh sách kế hoạch bạn tham gia'
                            : `Kế hoạch: ${selectedPlan?.name}`}
                    </p>
                </div>

                <div className={styles.impersonateBox}>
                    <label>Đóng vai:</label>
                    <select
                        value={currentStaffId}
                        onChange={e => setCurrentStaffId(e.target.value)}
                        className={styles.staffSelect}
                    >
                        {staffList.map(s => <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>)}
                    </select>
                </div>
            </header>

            {/* CONTENT */}
            <div className={styles.contentBody}>
                {loading && <div className={styles.loading}>Đang tải dữ liệu...</div>}

                {/* VIEW 1: PLAN LIST */}
                {!loading && viewMode === 'list' && (
                    <div className={styles.planGrid}>
                        {myPlans.length === 0 && <div className={styles.emptyState}>Bạn chưa tham gia kế hoạch nào.</div>}
                        {myPlans.map(plan => (
                            <div key={plan.id} className={styles.planCard} onClick={() => handlePlanClick(plan)}>
                                <div className={styles.cardIcon}>📂</div>
                                <div className={styles.cardContent}>
                                    <h3>{plan.name}</h3>
                                    <div className={styles.meta}>
                                        <span>📅 {plan.startMonth} - {plan.endMonth}</span>
                                        <span>🏢 {plan.unit?.name || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className={styles.cardArrow}>→</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* VIEW 2: PLAN DETAIL */}
                {!loading && viewMode === 'detail' && selectedPlan && (
                    <div className={styles.detailWrapper}>
                        <button className={styles.backBtn} onClick={handleBack}>← Quay lại danh sách</button>

                        <PlanDetailView
                            planId={selectedPlan.id}
                            currentStaffId={currentStaffId}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

// ==========================================
// SUB-COMPONENT: PLAN DETAIL VIEW
// ==========================================
const PlanDetailView = ({ planId, currentStaffId }) => {
    const [taskGroups, setTaskGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchGroups = async () => {
        try {
            const res = await axiosInstance.get(`/task/plan/${planId}`);
            setTaskGroups(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, [planId]);

    // Modal Create Action
    const [modalData, setModalData] = useState({ show: false, taskId: null });
    const openCreateAction = (taskId) => setModalData({ show: true, taskId });
    const closeCreateAction = () => setModalData({ show: false, taskId: null });

    const handleActionCreated = () => {
        closeCreateAction();
        alert("Đã tạo action thành công! Hãy mở lại task để xem.");
    };

    if (loading) return <div className={styles.loading}>Đang tải chi tiết công việc...</div>;
    if (taskGroups.length === 0) return <div className={styles.emptyState}>Kế hoạch này chưa có đầu việc nào.</div>;

    return (
        <>
            <div className={styles.groupList}>
                {taskGroups.map(group => (
                    <TaskGroupAccordion
                        key={group.uuid}
                        group={group}
                        currentStaffId={currentStaffId}
                        onOpenCreateAction={openCreateAction}
                    />
                ))}
            </div>

            {modalData.show && (
                <CreateActionModal
                    taskId={modalData.taskId}
                    currentStaffId={currentStaffId}
                    onClose={closeCreateAction}
                    onSuccess={handleActionCreated}
                />
            )}
        </>
    );
};

// ==========================================
// SUB-COMPONENT: TASK GROUP (Accordion Level 1)
// ==========================================
const TaskGroupAccordion = ({ group, currentStaffId, onOpenCreateAction }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const sortedTasks = [...(group.tasks || [])].sort((a, b) => a.month.localeCompare(b.month));

    return (
        <div className={`${styles.groupItem} ${isExpanded ? styles.expanded : ''}`}>
            <div className={styles.groupHeader} onClick={() => setIsExpanded(!isExpanded)}>
                <span className={styles.icon}>{isExpanded ? '▼' : '▶'}</span>
                <span className={styles.groupName}>{group.name || 'Công việc chưa đặt tên'}</span>
                <span className={styles.badge}>{sortedTasks.length} tháng</span>
            </div>

            {isExpanded && (
                <div className={styles.groupBody}>
                    {sortedTasks.map(task => (
                        <MonthlyTaskItem
                            key={task.id}
                            task={task}
                            currentStaffId={currentStaffId}
                            onOpenCreateAction={onOpenCreateAction}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ==========================================
// SUB-COMPONENT: MONTHLY TASK (Accordion Level 2)
// ==========================================
const MonthlyTaskItem = ({ task: initialTask, currentStaffId, onOpenCreateAction }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [task, setTask] = useState(initialTask); // Local state để update UI ngay khi đổi status

    // State quản lý deadline
    const [deadline, setDeadline] = useState(task.currentDeadline || task.initialDeadline);
    const [isEditingDeadline, setIsEditingDeadline] = useState(false);
    const [editForm, setEditForm] = useState({ date: '', reason: '' });

    const progressPercent = Math.round(task.progress * 100);

    // --- Handle Task Status Change ---
    const handleTaskStatusChange = async (newStatus) => {
        // Optimistic UI Update
        const oldStatus = task.status;
        setTask({ ...task, status: newStatus });

        try {
            // Lưu ý: Cần đảm bảo Backend có API này. Nếu chưa có, bạn cần thêm vào TaskController.
            // Ví dụ: PUT /api/task/{taskId}/status?status=...
            await axiosInstance.put(`/task/${task.id}/status`, null, {
                params: { status: newStatus }
            });
        } catch (error) {
            console.error("Lỗi cập nhật trạng thái Task:", error);
            alert("Không thể cập nhật trạng thái (Kiểm tra API Backend).");
            setTask({ ...task, status: oldStatus }); // Rollback
        }
    };

    // --- Handle Deadline Update ---
    const handleSaveDeadline = async () => {
        if (!editForm.date || !editForm.reason) return alert("Vui lòng nhập ngày mới và lý do.");
        try {
            await axiosInstance.post(`/task/${task.id}/extend-deadline`, null, {
                params: {
                    newDate: editForm.date,
                    reason: editForm.reason,
                    staffId: currentStaffId
                }
            });
            setDeadline(editForm.date);
            setIsEditingDeadline(false);
            alert("Cập nhật deadline thành công!");
        } catch (error) {
            alert("Lỗi: " + (error.response?.data || error.message));
        }
    };

    const startEditDeadline = () => {
        setEditForm({ date: deadline, reason: '' });
        setIsEditingDeadline(true);
    };

    return (
        <div className={styles.monthlyTask}>
            {/* Header Tháng - StopPropagation cho Dropdown để không bị đóng/mở accordion nhầm */}
            <div className={styles.monthHeader} onClick={() => setIsOpen(!isOpen)}>
                <div className={styles.monthTitle}>
                    <strong>Tháng {task.month}</strong>

                    {/* RADIO DROPDOWN cho Task Status */}
                    <div onClick={(e) => e.stopPropagation()} className={styles.taskStatusWrapper}>
                        <RadioDropdown
                            value={task.status}
                            onChange={handleTaskStatusChange}
                        />
                    </div>
                </div>

                <div className={styles.monthMeta}>
                    <div className={styles.progressBar}>
                        <div className={styles.fill} style={{width: `${progressPercent}%`}}></div>
                    </div>
                    <span className={styles.percentText}>{progressPercent}%</span>
                </div>
            </div>

            {/* Chi tiết */}
            {isOpen && (
                <div className={styles.monthBody}>
                    <p className={styles.desc}>{task.description || '(Không có mô tả)'}</p>

                    {/* SECTION: THÔNG TIN NGÀY & DEADLINE */}
                    <div className={styles.dateSection}>
                        <div className={styles.dateRow}>
                            <span className={styles.label}>Ngày bắt đầu:</span>
                            <span>{task.actualStartDate || 'Chưa bắt đầu'}</span>
                        </div>

                        <div className={styles.dateRow}>
                            <span className={styles.label}>Deadline:</span>
                            {!isEditingDeadline ? (
                                <div className={styles.deadlineDisplay}>
                                    <span className={styles.deadlineValue}>{deadline}</span>
                                    <button className={styles.editBtn} onClick={startEditDeadline} title="Gia hạn">✏️ Sửa</button>
                                </div>
                            ) : (
                                <div className={styles.deadlineEditForm}>
                                    <input
                                        type="date"
                                        value={editForm.date}
                                        onChange={e => setEditForm({...editForm, date: e.target.value})}
                                        className={styles.dateInput}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Nhập lý do..."
                                        value={editForm.reason}
                                        onChange={e => setEditForm({...editForm, reason: e.target.value})}
                                        className={styles.reasonInput}
                                    />
                                    <div className={styles.editActions}>
                                        <button className={styles.saveBtn} onClick={handleSaveDeadline}>Lưu</button>
                                        <button className={styles.cancelBtn} onClick={() => setIsEditingDeadline(false)}>Hủy</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SECTION: ACTION LIST */}
                    <div className={styles.actionSection}>
                        <div className={styles.actHeader}>
                            <h4>Danh sách Hành động cụ thể</h4>
                            <button
                                className={styles.addActBtn}
                                onClick={(e) => { e.stopPropagation(); onOpenCreateAction(task.id); }}
                            >
                                + Thêm Action
                            </button>
                        </div>
                        <ActionListFetcher taskId={task.id} currentStaffId={currentStaffId} />
                    </div>

                    {/* SECTION: PROGRESS SLIDER */}
                    <div className={styles.progressUpdate}>
                        <label>Cập nhật tiến độ ({progressPercent}%):</label>
                        <input
                            type="range" min="0" max="100" defaultValue={progressPercent}
                            onMouseUp={(e) => {
                                axiosInstance.patch(`/task/${task.id}/progress`, null, {
                                    params: { val: e.target.value / 100.0 }
                                }).catch(err => alert("Lỗi update progress"));
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// SUB-COMPONENT: ACTION LIST (With Radio Dropdown)
// ==========================================
const ActionListFetcher = ({ taskId, currentStaffId }) => {
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadActions = async () => {
        try {
            const res = await axiosInstance.get(`/task/action/task/${taskId}`);
            setActions(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadActions(); }, [taskId]);

    const handleStatusChange = async (action, newStatus) => {
        if (action.status === newStatus) return;
        const oldActions = [...actions];
        setActions(actions.map(a => a.id === action.id ? {...a, status: newStatus} : a));

        try {
            await axiosInstance.put(`/my-work/action/${action.id}/status`, null, {
                params: { staffId: currentStaffId, status: newStatus }
            });
        } catch (err) {
            alert("Lỗi cập nhật: " + (err.response?.data || err.message));
            setActions(oldActions);
        }
    };

    if (loading) return <small>Đang tải checklist...</small>;
    if (actions.length === 0) return <div className={styles.noAction}>Chưa có hành động nào.</div>;

    return (
        <ul className={styles.checklist}>
            {actions.map(act => (
                <li key={act.id} className={styles.actionItem}>
                    <div className={styles.actInfo}>
                        <span className={`${styles.actName} ${act.status === 'COMPLETED' ? styles.strike : ''}`}>
                            {act.name}
                        </span>
                        <span className={styles.deadline}>Hạn chót: {act.deadline}</span>
                    </div>

                    {/* Dùng RadioDropdown cho Action Status */}
                    <div className={styles.statusSelector}>
                        <RadioDropdown
                            value={act.status || 'PENDING'}
                            onChange={(val) => handleStatusChange(act, val)}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
};

// ==========================================
// SUB-COMPONENT: CREATE ACTION MODAL
// ==========================================
const CreateActionModal = ({ taskId, currentStaffId, onClose, onSuccess }) => {
    const [form, setForm] = useState({ name: '', description: '', deadline: new Date().toISOString().split('T')[0] });

    const submit = async () => {
        if (!form.name) return alert("Vui lòng nhập tên hành động");
        try {
            await axiosInstance.post('/task/action', {
                taskId: taskId,
                name: form.name,
                description: form.description,
                deadline: form.deadline,
                executors: [{ id: currentStaffId }]
            });
            onSuccess();
        } catch (e) {
            alert("Lỗi tạo mới: " + e.message);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h3>Thêm hành động mới</h3>
                <input
                    placeholder="Tên công việc..."
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                />
                <textarea
                    placeholder="Mô tả chi tiết..."
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                />
                <input
                    type="date"
                    value={form.deadline}
                    onChange={e => setForm({...form, deadline: e.target.value})}
                />
                <div className={styles.modalBtns}>
                    <button onClick={onClose} className={styles.btnCancel}>Hủy</button>
                    <button onClick={submit} className={styles.btnSubmit}>Lưu</button>
                </div>
            </div>
        </div>
    );
};

export default TaskManagement;