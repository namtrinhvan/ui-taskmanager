import React, {useEffect, useState, useMemo} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {
    ArrowRight, ChevronRight, Clock, Plus, UserCircle, Search, Trash2, UserPlus, X
} from 'lucide-react';
import {MdModeEditOutline} from "react-icons/md";
import axiosInstance from '../reusable/axiosInstance';
import styles from './PageDepartment.module.scss';
import clsx from "clsx";
import PlanDetailView from './PlanDetailView';
import CreatePlanModal from './CreatePlanModal';

// ============================================================================
// CONSTANTS: STATUS MAPPING
// ============================================================================
const PLAN_STATUS_MAP = {
    PENDING: 'Chờ duyệt', ONGOING: 'Đang thực hiện', COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy'
};

// ============================================================================
// COMPONENT: MANAGE MEMBERS MODAL
// ============================================================================
const ManageMembersModal = ({isOpen, onClose, currentMembers, onUpdateMembers, contextTitle}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const [localMembers, setLocalMembers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLocalMembers(currentMembers || []);
            fetchAllUsers();
        }
    }, [isOpen, currentMembers]);

    const fetchAllUsers = async () => {
        setLoadingUsers(true);
        try {
            const res = await axiosInstance.get('/org/employees'); // Adjust endpoint if needed
            setAllUsers(res.data || []);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const availableUsers = useMemo(() => {
        const memberEmails = new Set(localMembers.map(m => m.email));
        return allUsers.filter(u => !memberEmails.has(u.email) && (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())));
    }, [allUsers, localMembers, searchTerm]);

    const handleAddMember = (user) => {
        setLocalMembers([...localMembers, user]);
    };

    const handleRemoveMember = (email) => {
        setLocalMembers(localMembers.filter(m => m.email !== email));
    };

    const handleSave = () => {
        const newMemberEmails = localMembers.map(m => m.email);
        onUpdateMembers(newMemberEmails);
    };

    if (!isOpen) return null;

    return (<div className={styles.modalOverlay} style={{zIndex: 1100}}>
        <div className={styles.manageMemberModalBox}>
            <div className={styles.modalHeader}>
                <h3>Quản lý thành viên - {contextTitle}</h3>
                <button className={styles.closeBtnIcon} onClick={onClose}><X size={20}/></button>
            </div>
            <div className={styles.manageBody}>
                <div className={styles.columnLeft}>
                    <div className={styles.colHeader}><h4>Thành viên hiện tại ({localMembers.length})</h4></div>
                    <div className={styles.memberListScroll}>
                        {localMembers.map(m => (<div key={m.email} className={styles.miniMemberItem}>
                            <div className={styles.miniInfo}>
                                {m.picture ? <img src={m.picture} alt=""/> :
                                    <UserCircle size={24} className={styles.defAvatar}/>}
                                <div>
                                    <div className={styles.name}>{m.name}</div>
                                    <div className={styles.email}>{m.email}</div>
                                </div>
                            </div>
                            <button className={styles.removeBtn} onClick={() => handleRemoveMember(m.email)}
                                    title="Xóa khỏi nhóm"><Trash2 size={16}/></button>
                        </div>))}
                        {localMembers.length === 0 && <p className={styles.emptyText}>Chưa có thành viên nào.</p>}
                    </div>
                </div>
                <div className={styles.columnRight}>
                    <div className={styles.colHeader}><h4>Thêm nhân sự</h4></div>
                    <div className={styles.searchWrapper}>
                        <Search size={16} className={styles.searchIcon}/>
                        <input type="text" placeholder="Tìm theo tên hoặc email..." value={searchTerm}
                               onChange={(e) => setSearchTerm(e.target.value)}/>
                    </div>
                    <div className={styles.availableListScroll}>
                        {loadingUsers ? <p className={styles.loadingText}>Đang tải...</p> : (<>
                            {availableUsers.map(u => (<div key={u.email} className={styles.availableItem}
                                                           onClick={() => handleAddMember(u)}>
                                <div className={styles.miniInfo}>
                                    {u.picture ? <img src={u.picture} alt=""/> :
                                        <UserCircle size={20} className={styles.defAvatar}/>}
                                    <div className={styles.textWrap}>
                                        <div className={styles.name}>{u.name}</div>
                                    </div>
                                </div>
                                <UserPlus size={16} className={styles.addIcon}/>
                            </div>))}
                            {availableUsers.length === 0 &&
                                <p className={styles.emptyText}>Không tìm thấy nhân sự phù hợp.</p>}
                        </>)}
                    </div>
                </div>
            </div>
            <div className={styles.modalFooter}>
                <button className={styles.btnCancel} onClick={onClose}>Hủy</button>
                <button className={styles.btnSubmit} onClick={handleSave}>Lưu thay đổi</button>
            </div>
        </div>
    </div>);
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
const PageDepartment = () => {
    const {deptId, teamId, funcId} = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activePlanId = searchParams.get('plan');

    // Global Data
    const [data, setData] = useState(null);
    const [plans, setPlans] = useState([]);
    const [headDetail, setHeadDetail] = useState(null);
    const [availableEmployees, setAvailableEmployees] = useState({function: [], team: [], dept: []});

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showManageMembers, setShowManageMembers] = useState(false);

    const isFunctionLevel = !!funcId;
    const isTeamLevel = !!teamId && !isFunctionLevel;
    const isDeptLevel = !!deptId && !teamId && !isFunctionLevel;

    // --- FETCH DATA ---
    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Info Organization
            let orgEndpoint = '';
            if (isFunctionLevel) orgEndpoint = `/org/functions/${funcId}`; else if (isTeamLevel) orgEndpoint = `/org/teams/${teamId}`; else orgEndpoint = `/org/departments/${deptId}`;

            const orgRes = await axiosInstance.get(orgEndpoint);
            setData(orgRes.data);

            // 2. Fetch Plans for ALL levels
            let planEndpoint = '';
            if (isFunctionLevel) planEndpoint = `/planning/functions/${funcId}/plans`; else if (isTeamLevel) planEndpoint = `/planning/teams/${teamId}/plans`; else planEndpoint = `/planning/departments/${deptId}/plans`;

            try {
                const planRes = await axiosInstance.get(planEndpoint);
                setPlans(planRes.data || []);
            } catch (e) {
                console.warn("No plans found or API not ready for this level");
                setPlans([]);
            }

        } catch (err) {
            setError("Không thể tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [deptId, teamId, funcId, isFunctionLevel, isTeamLevel]);

    // --- FETCH HIERARCHY ---
    useEffect(() => {
        const fetchHierarchy = async () => {
            if (!isFunctionLevel || !data) return;
            try {
                const [fRes, tRes, dRes] = await Promise.all([axiosInstance.get(`/org/functions/${funcId}/members`), axiosInstance.get(`/org/teams/${data.teamId || teamId}/members`), axiosInstance.get(`/org/departments/${data.departmentId || deptId}/members`)]);
                const grouped = {function: fRes.data || [], team: tRes.data || [], dept: dRes.data || []};
                setAvailableEmployees(grouped);
                const all = [...grouped.function, ...grouped.team, ...grouped.dept];
                const found = all.find(e => e.email === data.head);
                setHeadDetail(found || {name: data.head, email: data.head});
            } catch (err) {
                console.error(err);
            }
        };

        if (isFunctionLevel && data) fetchHierarchy(); else if (data && !isFunctionLevel) {
            const found = data.members?.find(e => e.email === data.head);
            setHeadDetail(found || {name: data.head, email: data.head});
        }
    }, [isFunctionLevel, data, funcId, teamId, deptId]);

    // --- HANDLERS ---
    const handleBack = () => setSearchParams({});
    const handlePlanClick = (id) => setSearchParams({plan: id});

    // Updated: Refresh plan list or append new plan
    const onPlanCreated = (newPlan) => {
        setPlans([...plans, newPlan]);
    };

    const handleUpdateMembers = async (newEmails) => {
        try {
            let endpoint = '';
            if (isFunctionLevel) endpoint = `/org/functions/${funcId}/members`; else if (isTeamLevel) endpoint = `/org/teams/${teamId}/members`; else endpoint = `/org/departments/${deptId}/members`;

            await axiosInstance.put(endpoint, newEmails);
            await fetchData();
            setShowManageMembers(false);
            alert("Cập nhật thành viên thành công!");
        } catch (err) {
            console.error(err);
            alert("Lỗi khi cập nhật thành viên.");
        }
    };

    // Helper logic for card status border/bg (Giữ logic cũ để đảm bảo backward compatibility)
    const getStatusCardClass = (s) => {
        return clsx({
            [styles.statusPending]: s === 'PENDING',
            [styles.statusOngoing]: s === 'ONGOING',
            [styles.statusCompleted]: s === 'COMPLETED',
            [styles.statusCancelled]: s === 'CANCELLED',
        });
    };

    if (loading) return <div className={styles.loading}>Đang tải dữ liệu...</div>;
    if (error) return <div className={styles.error}>{error}</div>;
    if (!data) return null;

    // --- RENDER DETAIL VIEW ---
    if (activePlanId) {
        return (<PlanDetailView
            planId={activePlanId}
            onBack={handleBack}
            orgInfo={{
                name: data.name,
                deptId: deptId || data.departmentId || data.id,
                teamId: teamId || data.teamId,
                funcId: funcId,
                departmentName: isDeptLevel ? data.name : (data.departmentName || 'Department'),
                teamName: isTeamLevel ? data.name : (data.teamName || 'Team')
            }}
            navigate={navigate}
            availableEmployees={availableEmployees}
        />);
    }

    // --- RENDER OVERVIEW ---
    const renderBreadcrumb = () => (<div className={styles.breadcrumb}>
            <span onClick={() => navigate(`/department/${deptId}`)}
                  className={isDeptLevel ? styles.currentCrumb : styles.crumbLink}>
                {isDeptLevel ? data.name : (data.departmentName || 'Department')}
            </span>
        {!isDeptLevel && (<>
            <ChevronRight size={14}/>
            <span onClick={() => navigate(`/department/${deptId}/${teamId}`)}
                  className={isTeamLevel ? styles.currentCrumb : styles.crumbLink}>
                        {isTeamLevel ? data.name : (data.teamName || 'Team')}
                    </span>
        </>)}
        {isFunctionLevel && (<>
            <ChevronRight size={14}/>
            <span className={styles.currentCrumb}>{data.name}</span>
        </>)}
    </div>);

    // Member limit logic
    const visibleMembers = data.members?.slice(0, 20) || [];
    const remainingCount = (data.members?.length || 0) - 20;

    return (<div className={styles.container}>
        {renderBreadcrumb()}
        <div className={styles.header}>
            <div className={styles.departmentTitle}>
                <h1 className={styles.title}>{data.name}</h1><span
                className={clsx(styles.badge, isTeamLevel ? styles.team : isFunctionLevel ? styles.function : styles.department)}>
                        {isTeamLevel ? 'Nhóm' : isFunctionLevel ? 'Chức năng' : 'Bộ phận'}
                    </span></div>
            {headDetail && (<div className={styles.headInfo}>
                <span>Trưởng {isTeamLevel ? 'nhóm' : isFunctionLevel ? 'chức năng' : 'bộ phận'}:</span>
                {headDetail.picture ? <img src={headDetail.picture} className={styles.miniAvatar} alt=""/> :
                    <UserCircle size={20} className={styles.miniAvatar}/>}
                <span>{headDetail.name}</span>
            </div>)}
            {/*<p className={styles.description}>{data.description}</p>*/}
        </div>

        {/* SECTION 1: TRỰC THUỘC (Subordinates) - Only for Dept & Team */}
        {!isFunctionLevel && (<div className={styles.section}>
            <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>
                    {isDeptLevel ? 'Các Nhóm / Phòng ban trực thuộc' : 'Các Chức năng trực thuộc'}
                </h3>
            </div>
            <div className={styles.gridContainer}>
                {(isDeptLevel ? data.teams : data.functions)?.map(c => (<div key={c.id} className={styles.cardLink}
                                                                             onClick={() => navigate(isDeptLevel ? `/department/${data.id}/${c.id}` : `/department/${data.departmentId}/${data.id}/${c.id}`)}>
                    <div className={styles.cardIcon}><UserCircle size={24}/></div>
                    <div className={styles.cardContent}><h4>{c.name}</h4></div>
                    <ArrowRight className={styles.arrowIcon} size={20}/>
                </div>))}
                {((isDeptLevel && (!data.teams || data.teams.length === 0)) || (isTeamLevel && (!data.functions || data.functions.length === 0))) && (
                    <p className={styles.emptyText} style={{textAlign: 'left', marginLeft: 10}}>Chưa có đơn vị
                        trực thuộc.</p>)}
            </div>
        </div>)}

        {/* SECTION 2: KẾ HOẠCH (Plans) - For ALL Levels */}
        <div className={styles.section}>
            <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>Kế hoạch</h3>
                <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
                    <Plus size={16}/> Tạo Kế hoạch
                </button>
            </div>
            <div className={styles.plansGrid}>
                {plans.map(p => (<div key={p.id} className={clsx(styles.planCard, getStatusCardClass(p.status))}
                                      onClick={() => handlePlanClick(p.id)}>
                    <div className={styles.planHeader}>
                        <h4 className={styles.planTitle}>{p.name}</h4>
                        {/* UPDATED: Sử dụng clsx để map status class và hiển thị tên tiếng Việt
                            Các class styles.statusLabelPending, etc. cần được define trong SCSS
                        */}
                        <span className={clsx(styles.statusLabel, {
                            [styles.statusLabelPending]: p.status === 'PENDING',
                            [styles.statusLabelOngoing]: p.status === 'ONGOING',
                            [styles.statusLabelCompleted]: p.status === 'COMPLETED',
                            [styles.statusLabelCancelled]: p.status === 'CANCELLED',
                        })}>
                            {PLAN_STATUS_MAP[p.status] || p.status}
                        </span>
                    </div>
                    <p className={styles.planDates}><Clock size={12}/> {p.startMonth} - {p.endMonth}</p>

                    {/* Additional info for Dept/Team level to show context */}
                    {!isFunctionLevel && (<p style={{fontSize: '0.75rem', color: '#64748b', marginTop: 4}}>
                        {p.functionId ? `Chức năng: ${p.functionName || 'N/A'}` : (p.teamId ? `Nhóm: ${p.teamName || 'N/A'}` : 'Cấp Bộ phận')}
                    </p>)}

                    <div className={styles.progressContainer}>
                        <div className={styles.progressBarBg}>
                            <div className={styles.progressBarFill} style={{width: `${p.progress}%`}}></div>
                        </div>
                    </div>
                </div>))}
                {plans.length === 0 && (<div className={styles.emptyPlanBox}>
                    <p>Chưa có kế hoạch nào được thiết lập.</p>
                </div>)}
            </div>
        </div>

        <div className={styles.divider}/>

        {/* SECTION 3: MEMBERS */}
        <div className={styles.section}>
            <div className={styles.sectionHeaderRow}>
                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                    <h3 className={styles.sectionTitle} style={{marginBottom: 0}}>Thành viên
                        ({data.members?.length || 0})</h3>
                    <button className={styles.iconBtn} onClick={() => setShowManageMembers(true)}
                            title="Quản lý thành viên">
                        <MdModeEditOutline size={18}/>
                    </button>
                </div>
            </div>

            <div className={styles.memberList}>
                {visibleMembers.map(m => (<div key={m.email} className={styles.memberCard}>
                    {m.picture ? <img src={m.picture} className={styles.avatar} alt=""/> :
                        <UserCircle size={40} className={styles.defaultAvatar}/>}
                    <div className={styles.memberInfo}>
                        <span className={styles.memberName}>{m.name}</span>
                        <span className={styles.memberEmail}>{m.email}</span>
                    </div>
                </div>))}
            </div>

            {remainingCount > 0 && (<div className={styles.viewMoreContainer}>
                <button className={styles.viewMoreBtn} onClick={() => setShowManageMembers(true)}>
                    Xem tất cả ({data.members?.length}) thành viên
                </button>
            </div>)}
        </div>

        {/* CREATE PLAN MODAL */}
        {showCreateModal && (<CreatePlanModal
            onClose={() => setShowCreateModal(false)}
            onPlanCreated={onPlanCreated}
            data={data}
            availableEmployees={availableEmployees}
            isDeptLevel={isDeptLevel}
            isTeamLevel={isTeamLevel}
            isFunctionLevel={isFunctionLevel}
        />)}

        {/* MANAGE MEMBERS MODAL */}
        {showManageMembers && (<ManageMembersModal
            isOpen={showManageMembers}
            onClose={() => setShowManageMembers(false)}
            currentMembers={data.members || []}
            onUpdateMembers={handleUpdateMembers}
            contextTitle={data.name}
        />)}
    </div>);
};
export default PageDepartment;