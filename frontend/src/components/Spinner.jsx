import React from 'react';

const Spinner = () => {
  return (
    <div id='spinner' className='fixed inset-0 flex justify-center items-center z-50 pointer-events-none'>
        <div className="flex flex-col items-center pointer-events-auto">
            <div className='w-20 h-20 border-4 border-(--primary) rounded-full
            border-b-(--gray) animate-spin'
            role='status'>
            </div>

            <span className='ml-2 text-(--primary)'>Loading...</span>
        </div>
    </div>
  )
}

export default Spinner