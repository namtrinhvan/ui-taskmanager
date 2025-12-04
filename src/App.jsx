import React from "react";
import {BrowserRouter, Navigate, Outlet, Route, Routes} from "react-router-dom";

// Components
import PageWrapper from "./reusable/PageWrapper.jsx";
import './App.css';
import TaskManagement from "./TaskManagement/TaskManagement.jsx";
import PageDepartment from "./PageUnit/PageDepartment.jsx";

const MainLayout = () => {
    return (<PageWrapper>
        <Outlet/>
    </PageWrapper>);
};
const OrgChart = () => (<div style={{padding: 20}}>
    <h2>Sơ đồ tổ chức (Visual Chart)</h2>
    <p>Nơi hiển thị cây tổ chức dưới dạng biểu đồ đồ họa.</p>
</div>);

function App() {
    return (<BrowserRouter>
        <Routes>
            <Route element={<MainLayout/>}>
                <Route path="/tasks" element={<TaskManagement/>}/>
                <Route path="/unit/:unitId" element={<PageDepartment/>}/>
                <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
            </Route>
        </Routes>
    </BrowserRouter>);
}

export default App;