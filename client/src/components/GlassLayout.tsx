import React, { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface GlassLayoutProps {
  children: ReactNode
}

const GlassLayout: React.FC<GlassLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-surface-950">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-secondary/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-accent-primary/10 rounded-full blur-[80px]" />
        
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 min-h-screen"
      >
        <div className="glass-panel m-4 md:m-6 lg:m-8 min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
          <div className="relative h-full">
            {children}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default GlassLayout