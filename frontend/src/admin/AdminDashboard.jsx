import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import authService from "../services/authService";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import { DashboardModule, OfficesModule, GrievanceManagementModule, AnalyticsModule, ComingSoonModule } from "./components/modules";
import UserManagementModule from "./components/modules/UserManagementModule";
import ProfileModule from "./components/modules/ProfileModule";
import SettingsModule from "./components/modules/SettingsModule";
//taskkill /F /IM node.exe
//Start-Sleep -Seconds 2
function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Check user role on mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await authService.getProfile();
        if (response.success) {
          // Superadmin can now access all modules, no automatic redirect
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [navigate]);

  // Check for passed activeTab from navigation state
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      // Clear the state to prevent it from affecting future navigation
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // No automatic closing on resize - sidebar should always be controllable

  // Also close sidebar when clicking outside (for mobile)
  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebar = document.querySelector('.sidebar');
      const menuButton = document.querySelector('.menu-button');
      
      if (sidebar && menuButton && 
          !sidebar.contains(event.target) && 
          !menuButton.contains(event.target) &&
          window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [sidebarOpen]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }


  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar 
          activeTab={activeTab}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        
        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="w-full">
            {/* Dashboard View */}
            {activeTab === 'dashboard' && <DashboardModule onNavigate={setActiveTab} />}
            
            {/* Offices Management View */}
            {activeTab === 'offices' && <OfficesModule />}
            
            {/* User Management View */}
            {activeTab === 'users' && <UserManagementModule />}
            
            {/* Grievance Management View */}
            {activeTab === 'grievances' && <GrievanceManagementModule />}
            
            {/* Analytics View */}
            {activeTab === 'analytics' && <AnalyticsModule />}
            {activeTab === 'settings' && <SettingsModule />}
            {activeTab === 'profile' && <ProfileModule />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
