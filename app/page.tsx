import { getServerSession } from "next-auth";

export default async function Home() {
  const session = await getServerSession();
  console.log(JSON.stringify(session));

  return (
    <div className="h-screen w-full flex justify-center items-center text-5xl">
      COMING SOON
    </div>
  );
}
