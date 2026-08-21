import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

export default function ClientLayout() {
  return <div className="flex min-h-screen bg-[#FDFDFD] text-black"><Sidebar /><main className="flex-1 overflow-y-auto"><div className="p-8 max-w-7xl mx-auto"><Outlet /></div></main></div>;
}
