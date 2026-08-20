# memora.digit — سياق المشروع

## الفكرة
مشروع بيج انستغرام (وتيك توك) لبيع/توزيع قوالب مواقع ويب تفاعلية لمناسبات (اعياد ميلاد، اعياد حب) عبر رابط أو باركود.

## الإلهام
سبق وسوى المطور موقع عيد ميلاد فيه: انتقالات، شكل قلب يتحول لكيكة، ميوزك، انميشن، رسالة حب، ورد يطلع كهدية، وأزرار تفاعلية. النتيجة عجبته وصارت أساس الفكرة.

## السوق المستهدف
- الفئة العمرية 16-24 سنة، يدورون على هدايا مميزة وغير تقليدية.
- هذا النوع من المنتجات غير موجود بالعراق حالياً (الأقرب الها بس دعوات اعراس/خطوبة، مو اعياد ميلاد وحب).

## نموذج العمل
- قوالب جاهزة تُعرض بريلز على البيج، وتكون **قابلة للتعديل** حسب طلب الزبون (اسم، صور، رسالة...).
- اذا طلب الزبون تصميم خاص بالكامل → مشروع منفصل بسعر أعلى.
- التسليم: رابط افتراضياً، أو باركود اذا طلب الزبون (يتحول من نفس الرابط).
- لا يوجد حالياً موقع تعريفي، فقط حسابات سوشال ميديا.

## المتطلبات التقنية
- **الأداء متجاوب (Responsive)**: يشتغل بكفاءة عالية على كل الأجهزة، خصوصاً الموبايل (أغلب الزيارات من انستغرام/تيك توك على الموبايل).
- **الهيكلة يجب أن تكون قابلة لإعادة الاستخدام**: كل قالب يُبنى كـ"محرك" واحد يقرأ بيانات الزبون (اسم، صور، رسالة، ألوان...) من مكان مركزي (ملف config أو params بالرابط)، بدل تعديل الكود الأساسي يدوياً لكل زبون.

## خطة التنفيذ
1. تطوير القالب الأول وإكماله بالكامل.
2. الانتقال لقالب ثاني.
3. الاستمرار حتى الوصول لـ 4-5 قوالب جاهزة.
4. فتح البيج ونشر القوالب بالريلزات + بدء استقبال الطلبات.

## ملاحظة
اسم "memora.digit" مبدئي وقابل للتغيير لاحقاً.

## AI Coding Guardrails

- `src/templates/birthday/{boom,love,luxury,standard}/` are 4 **independent**
  templates plus shared `src/engine/`. Don't inspect a template other than the
  one the task is about unless comparing or porting behavior is explicitly
  required.
- Local files are the ground truth for exact code, editing, current runtime
  behavior, and line-level work — always read/edit them directly for that.
- For architecture, conventions, rationale, and historical design decisions,
  query NotebookLM MCP (`query_notebook`) first — see
  `docs/MEMORA_PROJECT_KNOWLEDGE.md`. Keep queries concise; use
  `get_source_content` only when the synthesized answer isn't enough.
- For recent changes/history, use `git log`/`git diff` — not a re-read, not
  NotebookLM.
- Never read `node_modules/`, `package-lock.json`, build output, or binary
  assets (`.png`/`.jpg`/`.glb`) as text.
- Don't change application code, package files, or MCP configuration unless
  the task explicitly asks for it.
