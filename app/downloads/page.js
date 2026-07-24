'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, FileText, Image as ImageIcon } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { documents, CLASS_OPTIONS, TAB_OPTIONS } from '@/lib/documentsRegistry';

const IMAGE_TYPES = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg'];

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function Downloads() {
  const [activeTab, setActiveTab] = useState('Datasheet');
  const [activeClass, setActiveClass] = useState('All');
  const [activeBrand, setActiveBrand] = useState('All Brands');
  const [searchQuery, setSearchQuery] = useState('');

  const brandsForClass = useMemo(() => {
    const pool =
      activeClass === 'All'
        ? documents
        : documents.filter((doc) => doc.productClass === activeClass);
    return Array.from(new Set(pool.map((doc) => doc.brand))).sort();
  }, [activeClass]);

  const filteredDocs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return documents.filter((doc) => {
      if (doc.category !== activeTab) return false;
      if (activeClass !== 'All' && doc.productClass !== activeClass) return false;
      if (activeBrand !== 'All Brands' && doc.brand !== activeBrand) return false;
      if (query && !doc.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [activeTab, activeClass, activeBrand, searchQuery]);

  function handleClassClick(cls) {
    setActiveClass(cls);
    setActiveBrand('All Brands');
  }

  function handleRowClick(doc) {
    window.open(doc.fileUrl, '_blank');
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-[1440px] mx-auto px-6 py-8">
        <div className="text-[13px] text-[#888] mb-6">
          <Link href="/" className="hover:text-[#2563eb]">
            Home
          </Link>
          <span className="mx-1.5">&gt;</span>
          <span className="text-[#111] font-medium">Downloads</span>
        </div>

        <div className="flex gap-8">
          <aside className="w-[200px] shrink-0">
            <div className="relative mb-6">
              <Search
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for Doc"
                className="border border-[#e0e0e0] rounded px-3 py-2 pl-8 text-[13px] w-full outline-none focus:border-[#2563eb]"
              />
            </div>

            <div className="mb-6">
              <div className="text-[13px] font-bold text-[#111] mb-2 px-3">Class</div>
              {CLASS_OPTIONS.map((cls) => (
                <div
                  key={cls}
                  onClick={() => handleClassClick(cls)}
                  className={`text-[13px] py-2 px-3 rounded cursor-pointer transition-colors ${
                    activeClass === cls
                      ? 'border-l-2 border-[#2563eb] bg-[#f0f6ff] text-[#2563eb] font-medium'
                      : 'text-[#444] hover:bg-[#f5f5f5]'
                  }`}
                >
                  {cls}
                </div>
              ))}
            </div>

            {activeClass !== 'All' && (
              <div>
                <div className="text-[13px] font-bold text-[#111] mb-2 px-3">Brands</div>
                <div
                  onClick={() => setActiveBrand('All Brands')}
                  className={`text-[13px] py-2 px-3 rounded cursor-pointer transition-colors ${
                    activeBrand === 'All Brands'
                      ? 'border-l-2 border-[#2563eb] bg-[#f0f6ff] text-[#2563eb] font-medium'
                      : 'text-[#444] hover:bg-[#f5f5f5]'
                  }`}
                >
                  All Brands
                </div>
                {brandsForClass.map((brand) => (
                  <div
                    key={brand}
                    onClick={() => setActiveBrand(brand)}
                    className={`text-[13px] py-2 px-3 rounded cursor-pointer transition-colors ${
                      activeBrand === brand
                        ? 'border-l-2 border-[#2563eb] bg-[#f0f6ff] text-[#2563eb] font-medium'
                        : 'text-[#444] hover:bg-[#f5f5f5]'
                    }`}
                  >
                    {brand}
                  </div>
                ))}
              </div>
            )}
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex gap-6 overflow-x-auto whitespace-nowrap border-b border-[#e8e8e8] mb-4">
              {TAB_OPTIONS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-[14px] transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-[#2563eb] text-[#2563eb] font-medium'
                      : 'text-[#666] hover:text-[#111]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="text-[13px] text-[#666] mb-3">
              {filteredDocs.length} document{filteredDocs.length === 1 ? '' : 's'}
            </div>

            <div className="border border-[#f0f0f0] rounded">
              <div className="flex justify-between items-center bg-[#f5f7fa] text-[#333] font-semibold text-[13px] px-4 py-3">
                <div className="flex-1">Name</div>
                <div className="w-[140px] text-right">Updated Date</div>
              </div>

              {filteredDocs.length === 0 ? (
                <div className="text-center text-[14px] text-[#999] py-16">
                  No documents found
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const isImage = IMAGE_TYPES.includes(doc.fileType);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleRowClick(doc)}
                      className="flex justify-between items-center px-4 py-3.5 border-b border-[#f0f0f0] hover:bg-[#f9fafb] cursor-pointer last:border-b-0"
                    >
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        {isImage ? (
                          <ImageIcon size={15} className="text-[#888] shrink-0" />
                        ) : (
                          <FileText size={15} className="text-[#888] shrink-0" />
                        )}
                        <span className="text-[14px] text-[#111] truncate">{doc.name}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-[13px] text-[#888]">
                          {formatDate(doc.updatedAt)}
                        </span>
                        <a
                          href={doc.fileUrl}
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#2563eb] text-[12px] hover:underline"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
