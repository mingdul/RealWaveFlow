import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { SocketProvider } from './contexts/SocketContext';
import { NotificationProvider } from './contexts/NotificationContext';
import './App.css';
import './styles/animations.css';

import LandingPage2 from './pages/LandingPage2.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage.tsx';
import Notfound from './pages/Notfound';
import StagePage from './pages/StagePage';
import PublicRoute from './components/PublicRoute.tsx';
import TrackPage from './pages/TrackPage.tsx';
import StemSetReviewPage from './pages/StemSetReviewPage.tsx';
import InvitePage from './pages/InvitePage.tsx';
import StemReview from './pages/StemReview.tsx';
import TrackPage3 from './pages/TrackPage3.tsx';
import TrackPageCopy from './pages/TrackPage copy.tsx';



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
              <Route path="/" element={<LandingPage2 />} />
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/invite/:token" element={<InvitePage />} />
              <Route path="/stage/:stageId" element={<StagePage />} />
              {/* <Route path="/review" element={<StemSetReviewPage />} /> */}
              <Route path="/stemreview/:upstreamId" element={<StemSetReviewPage />} />
              <Route path="*" element={<Notfound />} />
              <Route path="/review/:upstreamId" element={<StemReview />} />
              <Route path="/track/:trackId" element={<TrackPage />} />
              <Route path="/track3/:trackId" element={<TrackPage3 />} />
              <Route path="/trackcopy/:trackId" element={<TrackPageCopy />} />

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

