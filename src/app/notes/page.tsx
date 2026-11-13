import NotesPage from "@/pages/NotesPage/NotesPage";

export const metadata = {
  title: "Notes — Sara Royal Boutique",
  description: "Updates and practical stitching notes from Sara Royal Boutique.",
  robots: { index: false, follow: true },
};

export default function NotesRoute() {
  return <NotesPage />;
}
