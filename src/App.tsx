import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CollectionPage } from './pages/CollectionPage'
import { PDPPage } from './pages/PDPPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CollectionPage />} />
        <Route path="/products/:productId" element={<PDPPage />} />
      </Routes>
    </BrowserRouter>
  )
}
