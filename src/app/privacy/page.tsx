import React from 'react';
import { Metadata } from 'next';
import { Shield, Lock, Eye, FileText, Server, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية | Privacy Policy',
  description: 'سياسة الخصوصية لتطبيق الهاتف المحمول الخاص بنا.',
};

export default function PrivacyPolicy() {
  const currentDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 font-cairo" dir="rtl">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        
        {/* Header Section */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center justify-center p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4 text-blue-600 dark:text-blue-400">
            <Shield size={40} className="stroke-[1.5]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            سياسة الخصوصية
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">
            آخر تحديث: {currentDate}
          </p>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            نحن في <strong>ASN Technology</strong> نقدر خصوصيتك ونسعى جاهدين لحماية بياناتك الشخصية. توضح هذه السياسة كيف نقوم بجمع واستخدام وحماية معلوماتك عند استخدام تطبيق الهاتف المحمول الخاص بنا المرتبط بالنطاق asntechnology.net.
          </p>
        </div>

        {/* Content Section */}
        <div className="space-y-8 relative z-10">
          
          <PolicySection
            icon={<FileText size={24} />}
            title="1. جمع المعلومات واستخدامها"
            content="للحصول على تجربة أفضل أثناء استخدام تطبيقنا، قد نطلب منك تزويدنا ببعض المعلومات الشخصية التي يمكن التعرف عليها. سيتم الاحتفاظ بالمعلومات التي نطلبها من قبلنا واستخدامها كما هو موضح في سياسة الخصوصية هذه. قد يستخدم التطبيق خدمات جهات خارجية قد تجمع معلومات تستخدم لتحديد هويتك."
          />

          <PolicySection
            icon={<Server size={24} />}
            title="2. بيانات السجل (Log Data)"
            content="نود إعلامك بأنه كلما استخدمت تطبيقنا، وفي حالة حدوث خطأ في التطبيق، نقوم بجمع البيانات والمعلومات (من خلال منتجات جهات خارجية) على هاتفك تسمى بيانات السجل. قد تتضمن بيانات السجل هذه معلومات مثل عنوان بروتوكول الإنترنت (IP) الخاص بجهازك، واسم الجهاز، وإصدار نظام التشغيل، وتكوين التطبيق عند استخدامك لخدمتنا، ووقت وتاريخ استخدامك للخدمة، وإحصاءات أخرى."
          />

          <PolicySection
            icon={<Eye size={24} />}
            title="3. ملفات تعريف الارتباط (Cookies)"
            content="ملفات تعريف الارتباط هي ملفات تحتوي على كمية صغيرة من البيانات التي تُستخدم عادةً كمعرفات فريدة مجهولة المصدر. يتم إرسالها إلى متصفحك من مواقع الويب التي تزورها وتخزن على الذاكرة الداخلية لجهازك. لا يستخدم تطبيقنا ملفات تعريف الارتباط هذه بشكل صريح. ومع ذلك، قد يستخدم التطبيق رموزًا ومكتبات لجهات خارجية تستخدم ملفات تعريف الارتباط لجمع المعلومات وتحسين خدماتها."
          />

          <PolicySection
            icon={<Lock size={24} />}
            title="4. الأمان"
            content="نحن نقدر ثقتك في تزويدنا بمعلوماتك الشخصية، وبالتالي فإننا نسعى جاهدين لاستخدام وسائل مقبولة تجارياً لحمايتها. ولكن تذكر أنه لا توجد طريقة نقل عبر الإنترنت أو طريقة تخزين إلكتروني آمنة وموثوقة بنسبة 100٪، ولا يمكننا ضمان أمنها المطلق."
          />

          <PolicySection
            icon={<Shield size={24} />}
            title="5. التغييرات على سياسة الخصوصية"
            content="قد نقوم بتحديث سياسة الخصوصية الخاصة بنا من وقت لآخر. وبالتالي، ننصحك بمراجعة هذه الصفحة بشكل دوري لمعرفة أي تغييرات. سنقوم بإعلامك بأي تغييرات عن طريق نشر سياسة الخصوصية الجديدة على هذه الصفحة. هذه التغييرات فعالة فور نشرها."
          />

          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 mt-12">
            <div className="flex items-center gap-4 mb-4 text-slate-800 dark:text-white">
              <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
                <Mail size={24} />
              </div>
              <h2 className="text-2xl font-bold font-cairo">اتصل بنا</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6 font-cairo text-lg">
              إذا كان لديك أي أسئلة أو اقتراحات حول سياسة الخصوصية الخاصة بنا، فلا تتردد في الاتصال بنا. نحن دائماً هنا للمساعدة والإجابة على استفساراتك.
            </p>
            <a 
              href="mailto:asntechnology1@gmail.com"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors duration-200"
            >
              <Mail size={20} />
              <span>راسلنا عبر البريد الإلكتروني</span>
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}

function PolicySection({ icon, title, content }: { icon: React.ReactNode, title: string, content: string }) {
  return (
    <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-white dark:hover:bg-slate-900/80 group">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-700 dark:text-slate-300 group-hover:scale-110 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-300 flex-shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-3 font-cairo group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-cairo text-base md:text-lg text-justify">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}
