import { createBrowserRouter } from "react-router";
import { Root } from "./Root";
import { Home } from "./pages/Home";
import { LeaderboardPage } from "./pages/Leaderboard";
import { RefereeProfile } from "./pages/RefereeProfile";
import { VotePage } from "./pages/VotePage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { MatchesPage } from "./pages/MatchesPage";
import { RefereesPage } from "./pages/RefereesPage";
import { TrendingCommentsPage } from "./pages/TrendingCommentsPage";
import { AllPerformancesPage } from "./pages/AllPerformancesPage";
// Onboarding
import { SplashScreen } from "./pages/onboarding/SplashScreen";
import { WelcomePage } from "./pages/onboarding/WelcomePage";
import { NotificationsPage } from "./pages/onboarding/NotificationsPage";
import { FollowTeamsPage } from "./pages/onboarding/FollowTeamsPage";
import { FollowCompetitionsPage } from "./pages/onboarding/FollowCompetitionsPage";
// Auth
import { SignUpPage } from "./pages/auth/SignUpPage";
import { CompleteProfilePage } from "./pages/auth/CompleteProfilePage";
import { AccountSuccessPage } from "./pages/auth/AccountSuccessPage";
import { SignInPage } from "./pages/auth/SignInPage";
import { ForgotEmailPage } from "./pages/auth/ForgotEmailPage";
import { ForgotOTPPage } from "./pages/auth/ForgotOTPPage";
import { NewPasswordPage } from "./pages/auth/NewPasswordPage";
import { ResetSuccessPage } from "./pages/auth/ResetSuccessPage";
// Home variants
import { HomeFitPage } from "./pages/HomeFitPage";
import { SportMenuPage } from "./pages/SportMenuPage";
import { HomeLivePage } from "./pages/HomeLivePage";
import { HomeCalendarPage } from "./pages/HomeCalendarPage";
// Search
import { SearchPage } from "./pages/SearchPage";
import { TeamCardMatchesPage } from "./pages/TeamCardMatchesPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      // Main app
      { index: true, Component: Home },
      { path: "matches", Component: MatchesPage },
      { path: "leaderboard", Component: LeaderboardPage },
      { path: "referee/:id", Component: RefereeProfile },
      { path: "referee/:id/team/:team/cards", Component: TeamCardMatchesPage },
      { path: "referee/:id/vote/:matchId", Component: VotePage },
      { path: "profile", Component: UserProfilePage },
      { path: "referees", Component: RefereesPage },
      { path: "comments", Component: TrendingCommentsPage },
      { path: "performances", Component: AllPerformancesPage },
      // Home variants
      { path: "home/fit", Component: HomeFitPage },
      { path: "home/sport-menu", Component: SportMenuPage },
      { path: "home/live", Component: HomeLivePage },
      { path: "home/calendar", Component: HomeCalendarPage },
      // Search
      { path: "search", Component: SearchPage },
      // Onboarding
      { path: "splash", Component: SplashScreen },
      { path: "onboarding/welcome", Component: WelcomePage },
      { path: "onboarding/notifications", Component: NotificationsPage },
      { path: "onboarding/teams", Component: FollowTeamsPage },
      { path: "onboarding/competitions", Component: FollowCompetitionsPage },
      // Auth
      { path: "auth/signup", Component: SignUpPage },
      { path: "auth/complete-profile", Component: CompleteProfilePage },
      { path: "auth/success", Component: AccountSuccessPage },
      { path: "auth/signin", Component: SignInPage },
      { path: "auth/forgot-email", Component: ForgotEmailPage },
      { path: "auth/forgot-otp", Component: ForgotOTPPage },
      { path: "auth/new-password", Component: NewPasswordPage },
      { path: "auth/reset-success", Component: ResetSuccessPage },
    ],
  },
]);
