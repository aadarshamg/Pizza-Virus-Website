import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Layout, { RequireAuth, RequireStore } from './components/Layout';
import { FullPageSpinner } from './components/ui';
import MotionObserver from './components/MotionObserver';
import { useAuth } from './contexts/AuthContext';

import Home from './pages/Home';
import Landing from './pages/Landing';
import Menu from './pages/Menu';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import StoreSelect from './pages/StoreSelect';
import ZoneCheck from './pages/ZoneCheck';
import Addresses from './pages/Addresses';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import OrderSuccess from './pages/OrderSuccess';
import PaymentReturn from './pages/PaymentReturn';
import Offers from './pages/Offers';
import Profile from './pages/Profile';
import Support from './pages/Support';
import About from './pages/About';
import Legal from './pages/Legal';
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import VerifyOtp from './pages/auth/VerifyOtp';
import SetName from './pages/auth/SetName';
import ResetPassword from './pages/auth/ResetPassword';
import NotFound from './pages/NotFound';

const TITLES = {
    '/': 'Fresh Pizza Delivery in Phagwara',
    '/order': 'Order Online',
    '/menu': 'Menu',
    '/cart': 'Cart',
    '/offers': 'Offers',
    '/orders': 'My Orders',
    '/profile': 'My Account',
    '/addresses': 'Saved Addresses',
    '/support': 'Help & Support',
    '/about': 'About',
    '/login': 'Sign In',
    '/signup': 'Create Account',
    '/stores': 'Choose Store',
};

function ScrollAndTitle() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
        const t = TITLES[pathname];
        if (t) document.title = `${t} | Pizza Virus`;
    }, [pathname]);
    return null;
}

export default function App() {
    const { loading } = useAuth();
    if (loading) return <FullPageSpinner />;

    return (
        <>
            <ScrollAndTitle />
            <MotionObserver />
            <Routes>
                {/* Full-screen flows (no header/footer) */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/verify" element={<VerifyOtp />} />
                <Route path="/set-name" element={<SetName />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/stores" element={<StoreSelect />} />
                <Route path="/zone-check" element={<ZoneCheck />} />

                <Route element={<Layout />}>
                    {/* Need a selected store (menus and prices are per store) */}
                    <Route element={<RequireStore />}>
                        <Route path="/order" element={<Home />} />
                        <Route path="/menu" element={<Menu />} />
                        <Route path="/product/:id" element={<ProductDetail />} />
                        <Route path="/cart" element={<Cart />} />
                    </Route>

                    <Route element={<RequireAuth />}>
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/orders/:id" element={<OrderDetail />} />
                        <Route path="/order-success/:id" element={<OrderSuccess />} />
                        <Route path="/payment/return" element={<PaymentReturn />} />
                        <Route path="/addresses" element={<Addresses />} />
                        <Route path="/profile" element={<Profile />} />
                    </Route>

                    <Route index element={<Landing />} />
                    <Route path="/offers" element={<Offers />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/legal/:section?" element={<Legal />} />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </>
    );
}
