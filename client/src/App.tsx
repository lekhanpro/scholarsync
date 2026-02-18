import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import GlassLayout from './components/GlassLayout'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <Router>
      <GlassLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </GlassLayout>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          className: 'glass-card',
          style: {
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white'
          }
        }}
      />
    </Router>
  )
}

export default App