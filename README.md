# הדפדפן הפרטי שלי — Cloudflare

גרסה ראשונה: דף בעברית לפתיחת אתר ציבורי ב־Browser Run. מוצגים צילום מסך, כותרת וטקסט. כל הפעלה סוגרת את הדפדפן בסיום.

## פריסה

1. פתח מסוף בתיקייה הזאת והרץ `npm install`.
2. הרץ `npx wrangler login` והתחבר לחשבון Cloudflare שלך.
3. הרץ `npm run deploy`. קבל את כתובת ה־`workers.dev` שמופיעה בסיום.
4. **לפני שימוש:** בלוח הבקרה של Cloudflare עבור אל Workers & Pages → `shmuel-private-browser` → Access → Protect this Worker behind Access → **All traffic** → Authentication policy: **Cloudflare account** → Apply Access. אפשר להגביל לחשבון שלך בלבד.
5. פתח את כתובת ה־Worker והתחבר. בלי Access מופיעה הודעת 403, בכוונה.

הגדרות Access חייבות לחול על **All traffic**, גם על preview. ודא שאין מדיניות bypass. אין בקוד מפתחות, סיסמאות או הרשאות ל־Drive. אין צורך בדומיין אישי.

## פיתוח ובדיקה

`npm run dev` יפתח שרת פיתוח, אך הוא חסום במכוון בלי `ctx.access`. בדיקת הפעולה המלאה נעשית לאחר הגדרת Access ב־Worker שפורסם. אפשר לבדוק סירוב גישה באופן מקומי.

## היקף ומחיר

זה דפדפן אוטומטי זמני שמצלם וקורא דפים. עדיין אין שליטה בעכבר, כניסה לחשבונות אתרים, AI, הורדת קבצים או חיבור ל־Drive. Browser Run נמדד לפי שעות דפדפן; בחבילת Workers Paid כלולות 10 שעות בחודש, ומעבר לכך יש חיוב נוסף. עקוב אחר Browser Run → Usage בלוח הבקרה.
