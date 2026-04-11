import React from 'react';
import { FaFacebook, FaInstagram } from "react-icons/fa";

interface ASNFooterProps {
    show?: boolean;
}

export default function ASNFooter({ show = true }: ASNFooterProps) {
    if (!show) return null;
    
    return (
        <div className="w-full text-center py-8 pb-32 flex flex-col items-center justify-center gap-3 z-10 relative">
            <p className="text-sm font-bold opacity-70" dir="rtl">
                تصميم وتنفيذ <span className="font-extrabold font-en" style={{ color: '#2563eb' }}>ASN technology</span>
            </p>
            <a 
                href="https://www.facebook.com/ASNtechnology1" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 border"
                style={{
                    backgroundColor: 'rgba(37, 99, 235, 0.05)',
                    borderColor: 'rgba(37, 99, 235, 0.2)',
                    color: '#2563eb'
                }}
                dir="rtl"
            >
                <FaFacebook className="w-5 h-5" />
                <span className="text-xs font-bold tracking-wider">لطلب منيو رقمي تواصل معنا</span>
            </a>
        </div>
    );
}
