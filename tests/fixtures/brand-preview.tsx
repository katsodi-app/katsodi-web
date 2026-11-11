// Isolated visual harness for signed-in forms and framework states. Not an app route.
import { createRoot } from "react-dom/client";
import {
  WorkspaceProvider,
  useWorkspace,
} from "../../src/components/workspace-provider";
import { ProfileForm } from "../../src/components/account-forms";
import {
  NetworkCatalog,
  NetworkCreate,
} from "../../src/components/network-rooms";
import { ProfilePage } from "../../src/components/community-pages";
import { FriendsWorkspace } from "../../src/components/friends-workspace";
import { FandomRequestPage } from "../../src/components/fandom-request";
import { AdminPanel } from "../../src/components/admin-panel";

// Fixed once at load, so re-renders do not move the countdown.
const loadedAt = Date.now();
const lifecycleTimes = {
  empty: new Date(loadedAt - 12 * 60000).toISOString(),
  inactive: new Date(loadedAt - 2 * 60000).toISOString(),
  live: new Date(loadedAt).toISOString(),
};
const requests = [
  {
    id: "40000000-0000-4000-8000-000000000001",
    user_id: "10000000-0000-4000-8000-000000000021",
    name: "Frieren",
    category: "anime" as const,
    note: "Сказка о времени и памяти",
    status: "pending" as const,
    reason: null,
    fandom_id: null,
    created_at: "2026-11-06T09:00:00Z",
    decided_at: null,
  },
  {
    id: "40000000-0000-4000-8000-000000000002",
    user_id: "10000000-0000-4000-8000-000000000021",
    name: "Arcane",
    category: "cinema" as const,
    note: null,
    status: "approved" as const,
    reason: "Добро пожаловать",
    fandom_id: "community-0123456789",
    created_at: "2026-11-05T09:00:00Z",
    decided_at: "2026-11-05T10:00:00Z",
  },
  {
    id: "40000000-0000-4000-8000-000000000003",
    user_id: "10000000-0000-4000-8000-000000000022",
    name: "Obscure Show",
    category: "cinema" as const,
    note: null,
    status: "rejected" as const,
    reason: "Слишком узко",
    fandom_id: null,
    created_at: "2026-11-04T09:00:00Z",
    decided_at: "2026-11-04T10:00:00Z",
  },
];
import ErrorPage from "../../src/app/error";
import Loading from "../../src/app/loading";
declare global {
  interface Window {
    __brandMode: string;
    __brandRetry?: number;
  }
}
function Content() {
  const { setLocale } = useWorkspace();
  const mode = window.__brandMode;
  return (
    <div className="brand-app">
      <div className="workspace" style={{ marginLeft: 0 }}>
        <header
          className="language-switch"
          style={{ margin: "20px auto", width: "fit-content" }}
        >
          <button onClick={() => setLocale("ru")}>RU</button>
          <button onClick={() => setLocale("en")}>EN</button>
        </header>
        <main style={{ maxWidth: 1300 }}>
          {mode === "create" ? (
            <NetworkCreate configured signedIn />
          ) : mode === "catalog-lifecycle" ? (
            <NetworkCatalog
              configured
              signedIn
              rooms={[
                {
                  id: "20000000-0000-4000-8000-000000000031",
                  owner_id: "10000000-0000-4000-8000-000000000001",
                  name: "Пустая комната",
                  description: "Никого нет уже 12 минут",
                  format: "video",
                  visibility: "public",
                  url: "",
                  art: "moon",
                  closed_at: null,
                  created_at: "2026-11-06T10:00:00Z",
                  last_occupied_at: lifecycleTimes.empty,
                  inactive_at: lifecycleTimes.inactive,
                },
                {
                  id: "20000000-0000-4000-8000-000000000032",
                  owner_id: "10000000-0000-4000-8000-000000000001",
                  name: "Живая комната",
                  fandom_id: "anime-0",
                  description: "Здесь сейчас люди",
                  format: "music",
                  visibility: "public",
                  url: "",
                  art: "wave",
                  closed_at: null,
                  created_at: "2026-11-06T10:00:00Z",
                  last_occupied_at: lifecycleTimes.live,
                  inactive_at: null,
                },
              ]}
            />
          ) : mode === "fandom-request" ? (
            <FandomRequestPage
              state={{ status: "ready", requests: requests.slice(1) }}
            />
          ) : mode === "fandom-request-signed-out" ? (
            <FandomRequestPage state={{ status: "signed-out" }} />
          ) : mode === "admin" ? (
            <AdminPanel
              state={{
                accounts: [
                  {
                    id: "10000000-0000-4000-8000-000000000001",
                    display_name: "Katsodi",
                    username: "katsodi",
                    email: "owner@example.org",
                    confirmed: true,
                    created_at: "2026-11-01T10:00:00Z",
                    is_admin: true,
                  },
                  {
                    id: "10000000-0000-4000-8000-000000000021",
                    display_name: "Луна",
                    username: "luna",
                    email: "luna@example.org",
                    confirmed: false,
                    created_at: "2026-11-02T10:00:00Z",
                    is_admin: false,
                  },
                ],
                requests,
                followers: { "cinema-6": 3, "community-0123456789": 1 },
                community: [
                  {
                    id: "community-0123456789",
                    name: "Arcane",
                    category: "cinema",
                    description: null,
                    created_at: "2026-11-05T10:00:00Z",
                  },
                ],
              }}
            />
          ) : mode === "profile" ? (
            <ProfilePage
              profile={{
                username: "luna",
                display_name: "Луна",
                bio: "Люблю космические истории, тихие плейлисты и хорошие разговоры.",
                created_at: "2026-11-01T12:00:00Z",
                fandoms: ["cinema-6", "anime-1"],
                progress: {
                  xp: 450,
                  level: 3,
                  into_level: 67,
                  next_level: 520,
                  achievements: [
                    {
                      id: "first_steps",
                      rarity: "common",
                      xp: 25,
                      unlocked_at: "2026-11-02T12:00:00Z",
                    },
                    {
                      id: "room_creator",
                      rarity: "rare",
                      xp: 75,
                      unlocked_at: null,
                    },
                    {
                      id: "legendary_member",
                      rarity: "legendary",
                      xp: 200,
                      unlocked_at: null,
                    },
                  ],
                },
                media: {
                  userId: "10000000-0000-4000-8000-000000000009",
                  avatar: true,
                  banner: true,
                  version: "v1",
                },
              }}
            />
          ) : mode === "friends" ? (
            <FriendsWorkspace
              overview={{
                friends: [
                  {
                    id: "10000000-0000-4000-8000-000000000021",
                    username: "tim",
                    display_name: "Тим",
                    since: "2026-11-02T12:00:00Z",
                  },
                ],
                incoming: [
                  {
                    id: "40000000-0000-4000-8000-000000000001",
                    user_id: "10000000-0000-4000-8000-000000000022",
                    username: "sasha",
                    display_name: "Саша",
                    created_at: "2026-11-04T10:00:00Z",
                  },
                ],
                outgoing: [
                  {
                    id: "40000000-0000-4000-8000-000000000002",
                    user_id: "10000000-0000-4000-8000-000000000023",
                    username: "nika",
                    display_name: "Ника",
                    created_at: "2026-11-04T11:00:00Z",
                  },
                ],
                blocked: [],
              }}
            />
          ) : mode === "error" ? (
            <ErrorPage
              reset={() => {
                window.__brandRetry = (window.__brandRetry || 0) + 1;
              }}
            />
          ) : mode === "loading" ? (
            <Loading />
          ) : (
            <ProfileForm
              profile={{
                username: "luna",
                display_name: "Луна",
                bio: "",
                onboarding_completed: false,
              }}
              followed={["cinema-6"]}
              onboarding={mode === "onboarding"}
              media={
                mode === "onboarding"
                  ? null
                  : {
                      userId: "10000000-0000-4000-8000-000000000009",
                      avatar: false,
                      banner: false,
                      version: null,
                    }
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <WorkspaceProvider>
    <Content />
  </WorkspaceProvider>,
);
