import { DirectChat } from "@/components/Messages";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DirectChat conversationId={id} />;
}
