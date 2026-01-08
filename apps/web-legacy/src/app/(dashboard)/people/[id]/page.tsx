import { notFound } from "next/navigation";
import { getPerson } from "@/actions/person";
import { getSession } from "@/lib/auth";
import { PersonProfile } from "@/components/person/person-profile";

interface PersonPageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { id } = await params;
  const [person, session] = await Promise.all([getPerson(id), getSession()]);

  if (!person) {
    notFound();
  }

  const isAdmin = session?.user?.role === "ADMIN";
  const isOwnProfile = session?.user?.personId === person.id;
  const canEdit = isAdmin || isOwnProfile;

  return <PersonProfile person={person} canEdit={canEdit} isAdmin={isAdmin} />;
}
