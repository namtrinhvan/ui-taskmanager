import React from 'react';
import {useParams} from "react-router-dom";
import styles from './PageDepartment.module.scss';

const PageDepartment = () => {
    const {unitId} = useParams();

    return (
        <div>
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h3>Kế hoạch đã tạo</h3>
                </div>
                <div className={styles.sectionContent}></div>
            </div>
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h3>Kế họach đã tham gia</h3>
                </div>
                <div className={styles.sectionContent}></div>
            </div>
        </div>);
};

export default PageDepartment;