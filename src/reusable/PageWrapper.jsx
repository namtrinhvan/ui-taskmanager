import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Network, ChevronRight, ChevronDown, Menu, Briefcase, Users, Zap, Circle, Home
} from 'lucide-react';
import axiosInstance from '../reusable/axiosInstance';
import styles from './PageWrapper.module.scss';
import {AiOutlineTeam} from "react-icons/ai";
import {GrGroup} from "react-icons/gr";

const PageWrapper = ({ children }) => {
    // --- LOGIC GIỮ NGUYÊN ---
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [hierarchy, setHierarchy] = useState([]);
    const [breadcrumbs, setBreadcrumbs] = useState([]);
    const [expandedNodes, setExpandedNodes] = useState({});

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const fetchHierarchy = async () => {
            try {
                const response = await axiosInstance.get('/unit/structure');
                setHierarchy(response.data || []);
            } catch (error) {
                console.error("Failed to fetch unit structure:", error);
            }
        };
        fetchHierarchy();
    }, []);

    const findNodePath = useMemo(() => {
        const search = (nodes, targetId, currentPath) => {
            for (const node of nodes) {
                if (String(node.id) === String(targetId)) {
                    return [...currentPath, node];
                }
                if (node.children && node.children.length > 0) {
                    const result = search(node.children, targetId, [...currentPath, node]);
                    if (result) return result;
                }
            }
            return null;
        };
        return (nodes, targetId) => search(nodes, targetId, []);
    }, []);

    useEffect(() => {
        const pathParts = location.pathname.split('/');
        let crumbs = [{ label: 'Dashboard', path: '/dashboard' }];

        if (pathParts[1] === 'unit' && pathParts[2]) {
            const unitId = pathParts[2];
            if (hierarchy.length > 0) {
                const pathNodes = findNodePath(hierarchy, unitId);
                if (pathNodes) {
                    const unitCrumbs = pathNodes.map(node => ({
                        label: node.name, path: `/unit/${node.id}`
                    }));
                    crumbs = [...crumbs, ...unitCrumbs];
                    setExpandedNodes(prev => {
                        const newExpanded = { ...prev };
                        pathNodes.forEach(node => {
                            if (String(node.id) !== String(unitId)) {
                                newExpanded[node.id] = true;
                            }
                        });
                        return newExpanded;
                    });
                } else {
                    crumbs.push({ label: `Unit #${unitId}`, path: location.pathname });
                }
            }
        } else if (location.pathname.includes('org-chart')) {
            crumbs.push({ label: 'Sơ đồ tổ chức', path: '/org-chart' });
        }
        setBreadcrumbs(crumbs);
    }, [location.pathname, hierarchy, findNodePath]);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const toggleNode = (e, nodeId) => {
        e.stopPropagation();
        setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
    };

    const isActive = (path) => location.pathname === path;

    // --- HELPER RENDER ---
    const getIconForUnit = (depth, level) => {
        const effectiveLevel = level !== undefined ? level : depth;
        // Icon style google fonts: mỏng nhẹ
        const props = { strokeWidth: 2, size: 18 };
        console.log(effectiveLevel)
        if (effectiveLevel === 'DEPARTMENT') return <GrGroup  {...props} />;
        if (effectiveLevel === 'GROUP') return <Users {...props} />;
        if (effectiveLevel === 'FUNCTION') return <AiOutlineTeam {...props} />;
        return <AiOutlineTeam size={15} strokeWidth={3} />;
    };

    const renderUnitNode = (node, depth = 0) => {
        const isExpanded = expandedNodes[node.id];
        const hasChildren = node.children && node.children.length > 0;
        const nodePath = `/unit/${node.id}`;
        const activeClass = isActive(nodePath) ? styles.active : '';

        // Google style thường không indent quá sâu mà dùng padding-left tăng dần
        const paddingLeftVal = isSidebarOpen ? `${16 + depth * 16}px` : '12px';

        return (
            <div key={node.id} className={styles.orgGroup}>
                <div
                    className={`${styles.menuItem} ${activeClass}`}
                    style={{ paddingLeft: paddingLeftVal }}
                    onClick={() => navigate(nodePath)}
                    title={node.name}
                >
                    {/* Icon mũi tên expand đặt bên trái giống VSCode/Drive nếu muốn,
                        nhưng ở đây giữ layout cũ: Icon - Text - Expand */}

                    <div className={styles.iconContainer}>
                        {getIconForUnit(depth, node.level)}
                    </div>

                    {isSidebarOpen && (
                        <>
                            <span className={styles.label}>{node.name}</span>
                            {hasChildren && (
                                <div
                                    className={styles.toggleIcon}
                                    onClick={(e) => toggleNode(e, node.id)}
                                >
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Render con */}
                {isSidebarOpen && hasChildren && isExpanded && (
                    <div className={styles.subLevelContainer}>
                        {node.children.map(child => renderUnitNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    const renderBreadcrumbs = () => {
        return (
            <div className={styles.breadcrumbContainer}>
                <div className={styles.breadcrumbHome} onClick={() => navigate('/dashboard')}>
                    <Home size={18} />
                </div>

                {breadcrumbs.length > 0 && <span className={styles.crumbSeparator}>/</span>}

                {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    if (index === 0 && crumb.path === '/dashboard') return null;

                    return (
                        <React.Fragment key={index}>
                            <span
                                className={`${styles.crumbItem} ${isLast ? styles.crumbActive : ''}`}
                                onClick={() => !isLast && navigate(crumb.path)}
                            >
                                {crumb.label}
                            </span>
                            {!isLast && <span className={styles.crumbSeparator}>/</span>}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

    return (
        <div className={styles.pageWrapper}>
            {/* --- SIDEBAR --- */}
            <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : styles.closed}`}>
                <div className={styles.sidebarHeader}>
                    {isSidebarOpen && (
                        <div className={styles.brandContainer}>
                        </div>
                    )}
                    <button className={styles.toggleBtn} onClick={toggleSidebar}>
                        <Menu size={24} strokeWidth={1.5} />
                    </button>
                </div>

                <nav className={styles.navContent}>

                    <div className={styles.sectionLabel}>{isSidebarOpen ? 'Tổng quan' : ''}</div>
                    <div
                        className={`${styles.menuItem} ${location.pathname === '/org-chart' ? styles.active : ''}`}
                        onClick={() => navigate('/org-chart')}
                        style={{ paddingLeft: isSidebarOpen ? '16px' : '12px' }}
                    >
                        <div className={styles.iconContainer}>
                            <Network size={20} strokeWidth={2} />
                        </div>
                        {isSidebarOpen && <span className={styles.label}>Sơ đồ tổ chức</span>}
                    </div>

                    <div className={styles.divider} />

                    <div className={styles.sectionLabel}>{isSidebarOpen ? 'Đơn vị' : ''}</div>
                    <div className={styles.hierarchyScroll}>
                        {hierarchy.length > 0 ? (
                            hierarchy.map(rootNode => renderUnitNode(rootNode, 0))
                        ) : (
                            <div className={styles.loadingState}>
                                {isSidebarOpen ? 'Đang tải dữ liệu...' : ''}
                            </div>
                        )}
                    </div>

                    <div className={styles.divider} />

                    <div className={styles.sectionLabel}>{isSidebarOpen ? 'Cá nhân' : ''}</div>
                    <div
                        className={`${styles.menuItem} ${location.pathname === '/tasks' ? styles.active : ''}`}
                        onClick={() => navigate('/tasks')}
                        style={{ paddingLeft: isSidebarOpen ? '16px' : '12px' }}
                    >
                        <div className={styles.iconContainer}>
                            <LayoutDashboard size={20} strokeWidth={2} />
                        </div>
                        {isSidebarOpen && <span className={styles.label}>Công việc của tôi</span>}
                    </div>
                </nav>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className={styles.mainContent}>
                <header className={styles.topHeader}>
                    {renderBreadcrumbs()}
                    <div className={styles.headerRight}>
                        {/* Google style avatar */}
                        <div className={styles.avatar}>N</div>
                    </div>
                </header>

                <div className={styles.pageBody}>
                    {children}
                </div>
            </main>
        </div>
    );
};

export default PageWrapper;