import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import { apiFetchSettings, apiUpsertSettings } from '../../api/settings';
import { SCORE_CRITERIA } from '../../data/scoreStore';
import { CheckCircle2, Save } from 'lucide-react';

function isoToLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-indigo-500' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

type CriteriaMax = { creativity: number; practicality: number; completion: number; presentation: number };

export default function AdminSettings() {
  const [deadline, setDeadline] = useState('');
  const [published, setPublished] = useState(false);
  const [savingOps, setSavingOps] = useState(false);
  const [savedOps, setSavedOps] = useState(false);

  const [maxValues, setMaxValues] = useState<CriteriaMax>({
    creativity: 25, practicality: 25, completion: 25, presentation: 25,
  });
  const [savingCriteria, setSavingCriteria] = useState(false);
  const [savedCriteria, setSavedCriteria] = useState(false);

  useEffect(() => {
    apiFetchSettings().then((s) => {
      setDeadline(s.submissionDeadline ? isoToLocal(s.submissionDeadline) : '');
      setPublished(s.scoresPublished);
      setMaxValues({
        creativity: s.creativityMax,
        practicality: s.practicalityMax,
        completion: s.completionMax,
        presentation: s.presentationMax,
      });
    }).catch(console.error);
  }, []);

  const criteriaTotal = maxValues.creativity + maxValues.practicality + maxValues.completion + maxValues.presentation;
  const criteriaValid = criteriaTotal === 100;

  const handleSaveOps = async () => {
    setSavingOps(true);
    try {
      await apiUpsertSettings({
        submissionDeadline: deadline ? new Date(deadline).toISOString() : null,
        scoresPublished: published,
      });
      setSavedOps(true);
      setTimeout(() => setSavedOps(false), 3000);
    } catch {
      console.error('운영 설정 저장 실패');
    } finally {
      setSavingOps(false);
    }
  };

  const handleSaveCriteria = async () => {
    if (!criteriaValid) return;
    setSavingCriteria(true);
    try {
      await apiUpsertSettings({
        creativityMax: maxValues.creativity,
        practicalityMax: maxValues.practicality,
        completionMax: maxValues.completion,
        presentationMax: maxValues.presentation,
      });
      setSavedCriteria(true);
      setTimeout(() => setSavedCriteria(false), 3000);
    } catch {
      console.error('배점 설정 저장 실패');
    } finally {
      setSavingCriteria(false);
    }
  };

  const setMax = (key: keyof CriteriaMax, raw: string) => {
    const val = Math.max(0, Math.min(100, Number(raw) || 0));
    setMaxValues((prev) => ({ ...prev, [key]: val }));
    setSavedCriteria(false);
  };

  return (
    <AdminLayout>
      {/* ── 운영 설정 ── */}
      <Card title="운영 설정" className="mb-5">
        <div className="space-y-5">
          {/* 제출 마감일시 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">제출 마감일시</label>
            <p className="text-xs text-gray-400 mb-2">
              설정한 일시 이후 참가자 제출이 잠기고 심사가 자동으로 시작됩니다.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => { setDeadline(e.target.value); setSavedOps(false); }}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#80766b]/30"
              />
              {deadline && (
                <button
                  onClick={() => { setDeadline(''); setSavedOps(false); }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                >
                  초기화
                </button>
              )}
            </div>
            {!deadline && (
              <p className="mt-1.5 text-xs text-amber-600">미설정 시 제출이 상시 열려있고 심사가 시작되지 않습니다.</p>
            )}
          </div>

          {/* 결과 공개 */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-gray-700">결과 공개</p>
              <p className="text-xs text-gray-400 mt-0.5">켜면 참가자 화면에 평가 점수와 순위가 공개됩니다.</p>
            </div>
            <Toggle checked={published} onChange={(v) => { setPublished(v); setSavedOps(false); }} />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {savedOps && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />저장됨
            </span>
          )}
          <button
            onClick={handleSaveOps}
            disabled={savingOps}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#80766b] text-white text-sm font-medium rounded-lg hover:bg-[#6e645a] disabled:opacity-40 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {savingOps ? '저장 중...' : '저장'}
          </button>
        </div>
      </Card>

      {/* ── 심사 배점 설정 ── */}
      <Card title="심사 배점 설정">
        <p className="text-xs text-gray-400 mb-5">
          각 항목의 배점을 설정합니다. 총합이 정확히 <strong>100점</strong>이어야 저장됩니다.
        </p>
        <div className="space-y-3">
          {SCORE_CRITERIA.map((c) => (
            <div key={c.key} className="flex items-center gap-4">
              <span className="text-sm text-gray-700 w-28 shrink-0">{c.label}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={maxValues[c.key]}
                onChange={(e) => setMax(c.key, e.target.value)}
                className="w-20 px-3 py-2 text-sm text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#80766b]/30"
              />
              <span className="text-sm text-gray-400">점</span>
            </div>
          ))}
        </div>

        {/* 총합 */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">총점 기준</span>
            <span className={`text-lg font-bold ${criteriaValid ? 'text-gray-800' : 'text-red-500'}`}>
              {criteriaTotal}점
            </span>
            {!criteriaValid && (
              <span className="text-xs text-red-500">총합이 100점이 되어야 합니다.</span>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {savedCriteria && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />저장됨
            </span>
          )}
          <button
            onClick={handleSaveCriteria}
            disabled={!criteriaValid || savingCriteria}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#80766b] text-white text-sm font-medium rounded-lg hover:bg-[#6e645a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {savingCriteria ? '저장 중...' : '저장'}
          </button>
        </div>
      </Card>
    </AdminLayout>
  );
}
