import React, { useState, useEffect } from 'react';
import { 
  FileText, Check, Download, Eye, 
  X, Upload, PenTool, Type, Calendar, Pencil, Trash2, Search, Ban, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Document } from './types';
import { rejectDocument, signDocument } from './lib/documents';

interface DocumentsProps {
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  updateLastAction: () => void;
  /** Only the organization receiving the items can sign or reject a letter. */
  currentUid: string;
}

const SignatureCanvas = ({ onSave, onClear }: { onSave: (dataUrl: string) => void, onClear: () => void }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL());
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      onClear();
    }
  };

  return (
    <div className="relative w-full h-48 bg-slate-50 border border-slate-200 rounded-[5px] overflow-hidden">
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        className="w-full h-full cursor-crosshair touch-none"
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
        onTouchStart={startDrawing}
        onTouchEnd={stopDrawing}
        onTouchMove={draw}
      />
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button 
          onClick={handleSave}
          className="px-4 py-1.5 bg-brand-primary rounded-[5px] text-xs font-bold text-white hover:bg-brand-dark transition-all"
        >
          Save
        </button>
        <button 
          onClick={handleClear}
          className="px-4 py-1.5 border border-slate-200 bg-white rounded-[5px] text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default function Documents({ documents, setDocuments, updateLastAction, currentUid }: DocumentsProps) {
  const [showSignModal, setShowSignModal] = useState(false);
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [signMethod, setSignMethod] = useState<'type' | 'draw'>('type');
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showAllPending, setShowAllPending] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDetails, setRejectDetails] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const pendingDocs = documents.filter(d => d.status === 'pending');
  const displayedPendingDocs = showAllPending ? pendingDocs : pendingDocs.slice(0, 2);
  const signedDocs = documents.filter(d => d.status === 'signed');

  const handleSign = (doc: any) => {
    setActiveDoc(doc);
    setShowSignModal(true);
  };

  const handleDeleteClick = (doc: any) => {
    setDocToDelete(doc);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (docToDelete) {
      // Rejecting keeps the letter (with its reason) for both organizations
      // rather than deleting it; it just leaves the pending list.
      await rejectDocument(docToDelete.id, rejectReason, rejectDetails)
        .catch(err => console.error('Could not reject document', err));
      updateLastAction();
      setShowDeleteModal(false);
      setDocToDelete(null);
      setRejectReason('');
      setRejectDetails('');
    }
  };

  const handleSignSubmit = async () => {
    if (activeDoc) {
      await signDocument(activeDoc.id, signerName.trim() || 'Signed by hand')
        .catch(err => console.error('Could not sign document', err));
      updateLastAction();
      setShowSignModal(false);
      setActiveDoc(null);
      setIsSigned(false);
      setSignatureSaved(false);
      setDrawnSignature(null);
      setUploadedImage(null);
      setSignerName('');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-brand-dark mb-2">Documents Awaiting Signature</h1>
        <p className="text-slate-500">Indicate when you have received items from a community partner.</p>
      </header>

      <div className="space-y-8">
        {/* Pending Signatures */}
        <section className="bg-white rounded-[5px] p-8 shadow-none border border-slate-100">
          <div className="flex justify-between items-center mb-8 gap-4">
            <h2 className="text-lg font-bold text-brand-dark flex-1">Pending Signatures</h2>
            {pendingDocs.length > 2 && (
              <button 
                onClick={() => setShowAllPending(!showAllPending)}
                className="text-brand-primary text-sm font-bold hover:underline whitespace-nowrap flex-shrink-0"
              >
                {showAllPending ? 'Show Less' : 'View More'}
              </button>
            )}
          </div>

          <div className="space-y-6">
            {displayedPendingDocs.map((doc) => (
              <div key={doc.id} className="p-6 rounded-[5px] border border-slate-100 hover:border-brand-primary/20 transition-all">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-brand-dark text-lg">{doc.title}</h3>
                      <span className="text-xs text-slate-400">{doc.timeAgo}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-4">
                      <span>From: <span className="font-bold text-brand-dark">{doc.fromName}</span></span>
                      <span>To: <span className="font-bold text-brand-dark">{doc.toName}</span></span>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">Your signature indicates that you have received the {doc.itemDescription}</p>
                    <div className={cn(
                      "flex items-center gap-2 text-xs font-bold",
                      doc.dueDate.toLowerCase().includes('tomorrow') ? "text-red-500" : "text-brand-primary"
                    )}>
                      <Calendar size={14} />
                      {doc.dueDate}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 justify-center w-full sm:w-auto">
                    {/* The organization that provided the items can see the letter but doesn't sign it. */}
                    {doc.toUid && doc.toUid !== currentUid ? (
                      <span className="px-4 py-3 rounded-[5px] bg-slate-50 border border-slate-100 text-xs font-bold text-slate-500 text-center whitespace-nowrap">
                        Waiting on {doc.toName}
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSign(doc)}
                          className="w-full py-3 bg-brand-primary hover:bg-brand-dark text-white rounded-[5px] font-bold transition-all"
                        >
                          Sign
                        </button>
                        <div className="flex gap-2 w-full">
                          <button
                            onClick={() => console.log('Viewing document:', doc.id)}
                            className="flex-1 p-3 flex justify-center items-center border border-slate-200 text-slate-700 rounded-[5px] hover:bg-slate-50 transition-all"
                            title="View document"
                          >
                            <Search size={20} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(doc)}
                            className="flex-1 p-3 flex justify-center items-center border border-red-100 text-red-500 rounded-[5px] hover:bg-red-50 transition-all"
                            title="Reject document request"
                          >
                            <Ban size={20} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Signed Documents */}
        <section className="bg-white rounded-[5px] p-8 shadow-none border border-slate-100">
          <h2 className="text-lg font-bold text-brand-dark mb-8">Signed Documents</h2>
          
          <div className="space-y-6">
            {signedDocs.map((doc) => (
              <div key={doc.id} className="p-6 rounded-[5px] border border-slate-100 bg-slate-50/30">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-brand-dark text-lg">{doc.title}</h3>
                      <span className="text-xs text-slate-400">{doc.timeAgo}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-4">
                      <span>From: <span className="font-bold text-brand-dark">{doc.fromName}</span></span>
                      <span>To: <span className="font-bold text-brand-dark">{doc.toName}</span></span>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">Your signature indicates that you have received the {doc.itemDescription}</p>
                    <div className="flex items-center gap-2 text-xs text-green-600 font-bold">
                      <Check size={16} />
                      Signed on {doc.signedDate}
                    </div>
                  </div>
                  <div className="flex flex-col justify-center">
                    <button className="flex items-center gap-2 px-8 py-3 border border-slate-200 text-slate-700 rounded-[5px] font-bold hover:bg-slate-50 transition-all">
                      <Download size={18} />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Signing Modal */}
      <AnimatePresence>
        {showSignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSignModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[5px] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-brand-dark">Documents Awaiting Signature</h3>
                <button onClick={() => setShowSignModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                <div>
                  <h4 className="font-bold text-brand-primary text-sm mb-2">{activeDoc?.title}</h4>
                  <p className="text-sm text-slate-500">Your signature indicates that you have received the {activeDoc?.itemDescription}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-bold text-slate-700">
                      {signMethod === 'type' ? 'Typed Signature*' : 'Drawn Signature*'}
                    </label>
                    <button 
                      onClick={() => setSignMethod(signMethod === 'type' ? 'draw' : 'type')}
                      className="text-xs font-bold text-brand-primary hover:underline"
                    >
                      {signMethod === 'type' ? 'Manually Sign Instead' : 'Type Signature Instead'}
                    </button>
                  </div>

                  {signMethod === 'type' ? (
                    <input
                      type="text"
                      placeholder="Your full name"
                      value={signerName}
                      onChange={(e) => {
                        setSignerName(e.target.value);
                        setIsSigned(!!e.target.value.trim());
                      }}
                      className="w-full px-4 py-3 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                  ) : (
                    <div className="space-y-4">
                      {drawnSignature ? (
                        <div className="w-full h-48 bg-slate-50 border border-slate-200 rounded-[5px] relative flex flex-col items-center justify-center overflow-hidden">
                          <img src={drawnSignature} alt="Signature" className="max-h-full object-contain" />
                          <div className="absolute bottom-4 right-4 flex gap-2">
                            <button 
                              onClick={() => {
                                setDrawnSignature(null);
                                setIsSigned(false);
                                setSignatureSaved(false);
                              }}
                              className="px-4 py-1.5 border border-slate-200 bg-white rounded-[5px] text-xs font-bold text-slate-600 hover:bg-slate-50"
                            >
                              Clear
                            </button>
                          </div>
                          {signatureSaved && <span className="absolute top-4 right-4 text-[10px] text-green-600 font-bold flex items-center gap-1"><Check size={10}/> Signature Saved</span>}
                        </div>
                      ) : (
                        <SignatureCanvas 
                          onSave={(dataUrl) => {
                            setDrawnSignature(dataUrl);
                            setIsSigned(true);
                            setSignatureSaved(true);
                          }}
                          onClear={() => {
                            setDrawnSignature(null);
                            setIsSigned(false);
                            setSignatureSaved(false);
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-4">Upload Image of Received Items*</label>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setUploadedImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {uploadedImage ? (
                    <div className="relative w-full h-48 rounded-[5px] overflow-hidden border border-slate-200 group">
                      <img src={uploadedImage} alt="Uploaded items" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 bg-white rounded-full text-brand-primary hover:bg-slate-50 transition-colors"
                        >
                          <Pencil size={20} />
                        </button>
                        <button 
                          onClick={() => setUploadedImage(null)}
                          className="p-2 bg-white rounded-full text-red-500 hover:bg-slate-50 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-48 border-2 border-dashed border-slate-200 rounded-[5px] flex flex-col items-center justify-center p-8 text-center group hover:border-brand-primary/40 transition-all cursor-pointer"
                    >
                      <Upload className="text-slate-300 mb-4 group-hover:text-brand-primary transition-colors" size={32} />
                      <p className="text-slate-400 text-sm mb-2">Drag files here or</p>
                      <button className="px-6 py-2 border border-slate-200 rounded-[5px] text-sm font-bold text-slate-700 hover:bg-slate-50">Choose A File</button>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-brand-secondary/30 rounded-[5px] text-center">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    By signing the following document, you are indicating that you have successfully received your materials from the community partner.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" id="save-sig" className="w-5 h-5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary" />
                  <label htmlFor="save-sig" className="text-sm font-bold text-slate-700">Save Signature For Future Documents</label>
                </div>
              </div>

              <div className="p-8 bg-slate-50 flex justify-end">
                <button 
                  onClick={handleSignSubmit}
                  className="px-12 py-3.5 bg-brand-primary hover:bg-brand-dark text-white rounded-[5px] font-bold transition-all"
                >
                  Sign & Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-[5px] shadow-2xl w-full max-w-md overflow-hidden p-8"
            >
              <div className="flex items-center gap-4 text-red-600 mb-6">
                <Ban size={24} />
                <h3 className="text-xl font-bold">Reject Document Request?</h3>
              </div>
              
              <div className="space-y-6 mb-8">
                <p className="text-slate-600 leading-relaxed">
                  Are you sure you want to remove the document request for <span className="font-bold text-brand-dark">{docToDelete?.fromName}</span>?
                </p>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Reason for rejection*</label>
                  <div className="relative">
                    <select 
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-sm appearance-none bg-white pr-10"
                    >
                      <option value="">Select a reason...</option>
                      <option value="no-response">Received no response</option>
                      <option value="unavailable">Supplies no longer available</option>
                      <option value="credibility">Lack of credibility</option>
                      <option value="other">Other</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Additional Details (Optional)</label>
                  <textarea 
                    value={rejectDetails}
                    onChange={(e) => setRejectDetails(e.target.value)}
                    placeholder="Provide more context for the team..."
                    className="w-full px-4 py-2.5 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 min-h-[100px] text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setRejectReason('');
                    setRejectDetails('');
                  }}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-700 rounded-[5px] font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={!rejectReason}
                  className={cn(
                    "flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-[5px] font-bold transition-all",
                    !rejectReason && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
