import { MessageCircle } from "lucide-react";
import Link from "next/link";

export default function MessageButton() {
  return (
    <Link href="/test-messaging">
      <button className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 p-4 rounded-full shadow-lg transition-colors">
        <MessageCircle />
      </button>
    </Link>
  );
}
