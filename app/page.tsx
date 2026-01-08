import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession();
  
  if (session) {
    redirect('/tsmgowp/');
  }
  
  return (
    <div>
      {/* Your actual homepage content here */}
      <h1>Welcome to Your App</h1>
    </div>
  );
}