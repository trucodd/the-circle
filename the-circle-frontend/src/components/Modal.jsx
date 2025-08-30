const Modal = ({ isOpen, onClose, title, children, titleColor = "text-accent-cyan" }) => {
  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
      onClick={handleBackdropClick}
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="widget-card rounded-3xl p-8 w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${titleColor}`}>{title}</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              &times;
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal