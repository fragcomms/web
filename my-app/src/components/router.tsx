import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from '../pages/Home.tsx'
import About from '../pages/About.tsx'

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  )
}