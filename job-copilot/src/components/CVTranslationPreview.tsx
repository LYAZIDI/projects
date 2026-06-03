import { X, Download, Globe, Briefcase, GraduationCap, Star, Languages } from 'lucide-react'

export interface TranslatedCV {
  name: string
  email: string
  phone: string
  summary: string
  skills: string[]
  experience: { title: string; company: string; period: string; bullets: string[] }[]
  education: { degree: string; school: string; year: string }[]
  languages: string[]
  detectedSourceLanguage: string
}

interface Props {
  translated: TranslatedCV
  onClose: () => void
  onDownload: () => void
  downloading: boolean
}

export default function CVTranslationPreview({ translated, onClose, onDownload, downloading }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Globe size={20} className="text-indigo-500" />
            <h2 className="font-bold text-gray-900">CV traduit en anglais</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {translated.detectedSourceLanguage} → English
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Identity */}
          <div className="bg-indigo-50 rounded-xl p-4">
            <h3 className="text-lg font-bold text-gray-900">{translated.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{translated.email}{translated.phone ? ` • ${translated.phone}` : ''}</p>
            {translated.summary && (
              <p className="text-sm text-gray-700 mt-3 leading-relaxed border-t border-indigo-100 pt-3">
                {translated.summary}
              </p>
            )}
          </div>

          {/* Skills */}
          {translated.skills.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Star size={14} className="text-indigo-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Skills</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {translated.skills.map(skill => (
                  <span key={skill} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {translated.experience.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Briefcase size={14} className="text-indigo-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Experience</p>
              </div>
              <div className="space-y-4">
                {translated.experience.map((exp, i) => (
                  <div key={i} className="border-l-2 border-indigo-100 pl-3">
                    <p className="font-semibold text-gray-900 text-sm">{exp.title}</p>
                    <p className="text-xs text-indigo-600 font-medium">{exp.company}</p>
                    <p className="text-xs text-gray-400 mb-1.5">{exp.period}</p>
                    {exp.bullets.length > 0 && (
                      <ul className="space-y-1">
                        {exp.bullets.map((b, j) => (
                          <li key={j} className="text-xs text-gray-600 flex gap-1.5">
                            <span className="text-indigo-300 shrink-0 mt-0.5">•</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {translated.education.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <GraduationCap size={14} className="text-indigo-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Education</p>
              </div>
              <div className="space-y-2">
                {translated.education.map((edu, i) => (
                  <div key={i} className="border-l-2 border-indigo-100 pl-3">
                    <p className="font-semibold text-gray-900 text-sm">{edu.degree}</p>
                    <p className="text-xs text-gray-500">{edu.school}{edu.year ? ` — ${edu.year}` : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {translated.languages.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Languages size={14} className="text-indigo-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Languages</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {translated.languages.map(lang => (
                  <span key={lang} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex gap-3">
          <button
            onClick={onDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {downloading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Télécharger CV Word (EN)
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
