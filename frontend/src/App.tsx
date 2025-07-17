import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { SocketProvider } from './contexts/SocketContext';
import { NotificationProvider } from './contexts/NotificationContext';
import './App.css';

import LandingPage from './pages/LandingPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import Notfound from './pages/Notfound';
import StagePage from './pages/StagePage';
import PublicRoute from './components/PublicRoute.tsx';
import TrackPage from './pages/TrackPage.tsx';
import StemSetReviewPage from './pages/StemSetReviewPage.tsx';
import DashboardPageV2 from './pages/DashboardssPageV2.tsx';
import InvitePage from './pages/InvitePage.tsx';
import ProjectPage from './pages/ProjectPage.tsx';

// import PR_Page from './pages/PR_Page.tsx';     
// import MasterPage from './pages/MasterPage';
// import CommitPage from './pages/UploadPage';
// import AddProjectPage from './pages/AddProjectPage';
// import PublicRoute from './components/PublicRoute.tsx';
// import BranchPage from './pages/BranchPage.tsx';
// import InitProjectPage from './pages/InitProjectPage.tsx';
// import PR_ConfirmPage from './pages/PR_ConfirmPage.tsx';
// import DropHistoryPage from './pages/DropHistoryPage.tsx';

const App = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <SocketProvider>
              <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />
              <Route path="/dashboard" element={<DashboardPageV2 />} />
              <Route path="/newdash" element={<DashboardPage />} />
              <Route path="/track/:trackId" element={<ProjectPage />} />
              <Route path="/project/:trackId" element={<TrackPage />} />
              <Route path="/invite/:token" element={<InvitePage />} />
              <Route path="/stage/:stageId" element={<StagePage />} />
              {/* <Route path="/review" element={<StemSetReviewPage />} /> */}
              <Route path="/review/:upstreamId" element={<StemSetReviewPage />} />
              <Route path="*" element={<Notfound />} />
              {/* <Route path="/master" element={<MasterPage />} />
              <Route path="/commit" element={<CommitPage />} />
              <Route path="/pr" element={<PR_Page />} /> 
              <Route path="/branch" element={<BranchPage />} />
              <Route path="/add-project" element={<AddProjectPage />} />
              
              <Route path="/init-project" element={<InitProjectPage />} />
              <Route path="/drop-review" element={<PR_ConfirmPage />} />
              <Route path="/master/:id/drop-history" element={<DropHistoryPage />} />
              <Route path="/track" element={<TrackPage />} /> */}
            </Routes>
          </SocketProvider>
        </NotificationProvider>
      </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;

