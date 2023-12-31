import { Outlet } from 'react-router-dom';
import MainNavigation from '../Components/UI/Navbar/MainNavigation';

function RootLayout() {
    return (
        <>
            <MainNavigation />
            <Outlet />
        </>
    );
}

export default RootLayout;
