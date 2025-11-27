import { Routes, Route } from 'react-router-dom'
import { EventProvider } from '@/context/EventContext'
import Home from '@/pages/Home'

export default function App() {
    return (
        <EventProvider>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <main className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-screen">
                    <Routes>
                        <Route path="/" element={<Home />} />
                    </Routes>
                </main>
            </div>
        </EventProvider>
    )
}
