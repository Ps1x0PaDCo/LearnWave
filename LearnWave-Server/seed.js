const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const quiz = (question, options, correct) => JSON.stringify({ question, options, correct });

const categories = [
  { id: 1, title: 'Точные науки', color: '#4A90E2' },
  { id: 2, title: 'Естественные науки', color: '#2ECC71' },
  { id: 3, title: 'IT и программирование', color: '#9B59B6' },
  { id: 4, title: 'Гуманитарные науки', color: '#F39C12' },
  { id: 5, title: 'Языки', color: '#E74C3C' },
  { id: 6, title: 'Прочие', color: '#64748B' },
];

const contentData = [
  {
    course: { title: 'Математика', description: 'Короткие модули по ключевым темам: смысл, формула, пример и проверка.', category_id: 1, icon_name: 'calculator', color: '#4A90E2', subject_key: 'math' },
    topics: [
      {
        title: 'Производная функции',
        description: 'Как понять скорость изменения функции и зачем нужна производная.',
        content: `### Короткая теория
Производная показывает, как быстро меняется функция в конкретной точке. Если представить график как дорогу, производная показывает наклон дороги прямо сейчас: растёт функция, убывает или почти не меняется.

На графике производная связана с касательной: чем круче касательная, тем больше значение производной по модулю. Положительная производная означает рост функции, отрицательная - убывание, а значение около нуля часто указывает на возможный максимум или минимум.

Производная полезна, когда нужно найти скорость движения, темп роста, максимум прибыли, минимум затрат или момент, где поведение функции резко меняется.

### Формула
[FORMULA]f'(x)=lim_{h->0}(f(x+h)-f(x))/h[/FORMULA]

### Пример
Для функции \`f(x)=x²\` производная равна \`f'(x)=2x\`. В точке \`x=3\` скорость изменения равна \`6\`.

### Важный совет
Учить производную только как набор правил - слабая стратегия. Сначала полезно понять, что именно меняется и с какой скоростью, а уже потом применять формулы.`,
        quiz_question: quiz('Что показывает производная функции в точке?', ['Скорость изменения функции', 'Площадь под графиком', 'Только значение функции', 'Количество корней уравнения'], 'Скорость изменения функции'),
        quiz_answer: 'Скорость изменения функции',
        difficulty: 2,
      },
      {
        title: 'Квадратное уравнение',
        description: 'Дискриминант, корни и быстрый способ понять количество решений.',
        content: `### Короткая теория
Квадратное уравнение имеет вид \`ax²+bx+c=0\`, где \`a != 0\`. Его график - парабола. Корни уравнения показывают, где парабола пересекает ось X.

Главный инструмент - дискриминант. По его знаку можно быстро понять, сколько корней будет у уравнения, ещё до вычисления самих корней.

Если дискриминант положительный, парабола пересекает ось X в двух точках. Если равен нулю, она касается оси X в одной точке. Если отрицательный, пересечения с осью X среди действительных чисел нет.

### Формула
[FORMULA]D=b^2-4ac[/FORMULA]

### Как читать результат
- Если \`D > 0\`, есть два корня.
- Если \`D = 0\`, есть один корень.
- Если \`D < 0\`, действительных корней нет.

### Важный совет
Перед вычислением корней полезно сначала найти дискриминант. Это сразу показывает количество решений и помогает не делать лишних действий.`,
        quiz_question: quiz('Сколько действительных корней у квадратного уравнения, если D < 0?', ['Нет действительных корней', 'Один корень', 'Два корня', 'Бесконечно много корней'], 'Нет действительных корней'),
        quiz_answer: 'Нет действительных корней',
        difficulty: 1,
      },
      {
        title: 'Тригонометрическое тождество',
        description: 'Базовая связь синуса и косинуса одного угла.',
        content: `### Короткая теория
Синус и косинус связаны через единичную окружность. Для любого угла точка на окружности имеет координаты \`(cos alpha, sin alpha)\`. Так как радиус окружности равен 1, сумма квадратов координат тоже равна 1.

Это тождество часто используют, чтобы преобразовывать выражения и упрощать задачи. Оно работает для любого угла, поэтому его удобно применять и в вычислениях, и в доказательствах.

По смыслу формула говорит: синус и косинус одного угла не существуют отдельно друг от друга, между ними всегда есть строгая связь.

### Формула
[FORMULA]sin^2(alpha)+cos^2(alpha)=1[/FORMULA]

### Пример
Если \`sin(alpha)=0.6\`, то \`cos²(alpha)=1-0.36=0.64\`.

### Важный совет
Если в задаче встречаются \`sin²\` и \`cos²\` одного угла, почти всегда стоит проверить основное тригонометрическое тождество.`,
        quiz_question: quiz('Чему равна сумма sin²(alpha) + cos²(alpha)?', ['1', '0', 'alpha', '2'], '1'),
        quiz_answer: '1',
        difficulty: 1,
      },
    ],
  },
  {
    course: { title: 'Физика', description: 'Понятные модули о законах, формулах и физическом смысле величин.', category_id: 2, icon_name: 'flash', color: '#2ECC71', subject_key: 'physics' },
    topics: [
      {
        title: 'Закон Ома',
        description: 'Связь напряжения, силы тока и сопротивления в электрической цепи.',
        content: `### Короткая теория
Закон Ома описывает, как ток проходит через участок цепи. Чем больше напряжение, тем сильнее ток. Чем больше сопротивление, тем труднее току пройти.

Эта формула помогает рассчитывать простые электрические цепи и понимать, почему приборы требуют определённого напряжения. Закон особенно удобен, когда известны две величины из трёх: напряжение, сила тока или сопротивление.

Важно помнить физический смысл: сопротивление не "убирает" ток полностью, а ограничивает его при заданном напряжении.

### Формула
[FORMULA]I=U/R[/FORMULA]

### Пример
Если напряжение \`U=12 В\`, а сопротивление \`R=6 Ом\`, то сила тока \`I=2 А\`.

### Важный совет
Проверка единиц измерения часто спасает от ошибки: напряжение измеряется в вольтах, сопротивление - в омах, сила тока - в амперах.`,
        quiz_question: quiz('Что произойдёт с силой тока при увеличении сопротивления, если напряжение не меняется?', ['Сила тока уменьшится', 'Сила тока увеличится', 'Сила тока станет равной нулю всегда', 'Ничего не изменится'], 'Сила тока уменьшится'),
        quiz_answer: 'Сила тока уменьшится',
        difficulty: 1,
      },
      {
        title: 'Второй закон Ньютона',
        description: 'Почему тело ускоряется и как сила связана с массой.',
        content: `### Короткая теория
Второй закон Ньютона говорит: ускорение тела зависит от силы, которая на него действует, и от массы тела. Одну и ту же тележку легко разогнать, а грузовик - намного сложнее, потому что масса больше.

Закон помогает описывать движение транспорта, падение тел, удары и работу механизмов. Если равнодействующая сила равна нулю, ускорения нет: тело либо покоится, либо движется равномерно.

В задачах обычно важно найти не просто одну силу, а сумму всех сил, действующих на тело.

### Формула
[FORMULA]F=m*a[/FORMULA]

### Пример
Если масса тела \`m=5 кг\`, а ускорение \`a=3 м/с²\`, то сила \`F=15 Н\`.

### Важный совет
Схема сил перед вычислениями делает решение надёжнее: так проще не забыть трение, реакцию опоры или силу тяжести.`,
        quiz_question: quiz('По второму закону Ньютона сила равна...', ['масса умножить на ускорение', 'масса разделить на скорость', 'ускорение разделить на время', 'путь умножить на время'], 'масса умножить на ускорение'),
        quiz_answer: 'масса умножить на ускорение',
        difficulty: 1,
      },
      {
        title: 'Кинетическая энергия',
        description: 'Энергия движения и зависимость от массы и скорости.',
        content: `### Короткая теория
Кинетическая энергия - это энергия, которой обладает движущееся тело. Чем больше масса и скорость, тем больше энергия движения.

Особенно важно, что скорость входит в формулу в квадрате. Поэтому увеличение скорости в 2 раза увеличивает кинетическую энергию в 4 раза.

Эта зависимость объясняет, почему быстрые объекты могут быть опасны даже при небольшой массе: энергия растёт намного быстрее, чем скорость.

### Формула
[FORMULA]E_k=m*v^2/2[/FORMULA]

### Пример
Если масса \`m=2 кг\`, а скорость \`v=3 м/с\`, то \`E_k=9 Дж\`.

### Важный совет
При оценке движения скорость обычно важнее, чем кажется: из-за квадрата даже небольшое увеличение скорости заметно повышает энергию.`,
        quiz_question: quiz('Во сколько раз увеличится кинетическая энергия, если скорость увеличить в 2 раза?', ['В 4 раза', 'В 2 раза', 'В 8 раз', 'Не изменится'], 'В 4 раза'),
        quiz_answer: 'В 4 раза',
        difficulty: 2,
      },
    ],
  },
  {
    course: { title: 'Программирование на Python', description: 'Короткие практичные темы: переменные, условия и циклы.', category_id: 3, icon_name: 'code', color: '#9B59B6', subject_key: 'python_dev' },
    topics: [
      {
        title: 'Переменные и типы данных',
        description: 'Как хранить числа, строки и логические значения.',
        content: `### Короткая теория
Переменная - это имя для значения. В Python не нужно заранее указывать тип: язык сам понимает, что перед ним число, строка или логическое значение.

Это удобно, но требует внимательности. Если сложить число и строку напрямую, программа выдаст ошибку.

Тип данных влияет на то, какие операции с ним можно выполнять. Числа можно складывать математически, строки можно объединять, а логические значения удобно использовать в условиях.

### Пример
\`age = 16\`
\`name = "Илья"\`
\`is_admin = False\`

### Важный совет
Понятные имена переменных делают код устойчивее. \`student_age\` читается лучше, чем \`x\`, особенно когда программа становится больше.`,
        quiz_question: quiz('Что такое переменная в программировании?', ['Имя для хранения значения', 'Только математическая формула', 'Ошибка в коде', 'Команда для удаления файла'], 'Имя для хранения значения'),
        quiz_answer: 'Имя для хранения значения',
        difficulty: 1,
      },
      {
        title: 'Условия if/else',
        description: 'Как программа выбирает разные действия.',
        content: `### Короткая теория
Условия позволяют программе принимать решения. Если выражение истинно, выполняется один блок кода. Если ложно - другой.

В Python важны отступы: именно они показывают, какие строки относятся к условию.

Условия часто используют для проверки баллов, прав доступа, наличия данных или выбора следующего действия в интерфейсе. Благодаря этому программа перестаёт быть линейной и начинает реагировать на ситуацию.

### Пример
\`if score >= 70:\`
\`    print("Зачёт")\`
\`else:\`
\`    print("Повторить тему")\`

### Важный совет
Проверка граничных значений помогает найти логические ошибки. Если проходной балл 70, стоит отдельно проверить 69, 70 и 71.`,
        quiz_question: quiz('Что выполняется в блоке else?', ['Код для случая, когда условие if ложно', 'Код до запуска программы', 'Только комментарии', 'Всегда первая строка программы'], 'Код для случая, когда условие if ложно'),
        quiz_answer: 'Код для случая, когда условие if ложно',
        difficulty: 1,
      },
      {
        title: 'Цикл for',
        description: 'Как повторять действия для каждого элемента.',
        content: `### Короткая теория
Цикл \`for\` используют, когда нужно пройти по последовательности: списку, строке, диапазону чисел. Он выполняет один и тот же блок кода для каждого элемента.

Это удобно для обработки оценок, списка тем, пользователей или любых повторяющихся данных.

Цикл помогает не копировать одинаковые строки кода. Вместо десяти похожих команд можно написать один понятный шаблон действия и применить его ко всем элементам.

### Пример
\`for number in range(1, 4):\`
\`    print(number)\`

На экран выведутся числа 1, 2 и 3.

### Важный совет
В Python правая граница диапазона обычно не входит в результат: \`range(1, 4)\` даёт 1, 2 и 3.`,
        quiz_question: quiz('Что выведет range(1, 4) в цикле for?', ['1, 2, 3', '1, 2, 3, 4', '0, 1, 2, 3', 'Только 4'], '1, 2, 3'),
        quiz_answer: '1, 2, 3',
        difficulty: 1,
      },
    ],
  },
  {
    course: { title: 'Химия', description: 'Атомы, реакции и расчёты. Раздел готовится к наполнению.', category_id: 2, icon_name: 'flask', color: '#1ABC9C', subject_key: 'chemistry' },
    topics: [],
  },
  {
    course: { title: 'Биология', description: 'Клетка, организм и основы генетики. Скоро появятся первые модули.', category_id: 2, icon_name: 'leaf', color: '#27AE60', subject_key: 'biology' },
    topics: [],
  },
  {
    course: { title: 'История', description: 'Ключевые события и причинно-следственные связи в коротких темах.', category_id: 4, icon_name: 'book', color: '#F39C12', subject_key: 'history' },
    topics: [],
  },
  {
    course: { title: 'Английский язык', description: 'Грамматика, лексика и полезные речевые конструкции.', category_id: 5, icon_name: 'language', color: '#E74C3C', subject_key: 'english' },
    topics: [],
  },
  {
    course: { title: 'География', description: 'Карты, страны, климат и природные зоны в формате мини-уроков.', category_id: 4, icon_name: 'globe', color: '#3498DB', subject_key: 'geography' },
    topics: [],
  },
];

const glossaryData = [
  { term: 'Производная', definition: 'Величина, показывающая скорость изменения функции в точке.', subject_key: 'math' },
  { term: 'Дискриминант', definition: 'Выражение D = b^2 - 4ac, по которому определяют количество корней квадратного уравнения.', subject_key: 'math' },
  { term: 'Формула производной', definition: "f'(x)=lim при h->0 от (f(x+h)-f(x))/h. Показывает скорость изменения функции.", subject_key: 'math' },
  { term: 'Квадратное уравнение', definition: 'Уравнение вида ax²+bx+c=0, где a не равно 0. Количество корней удобно определять через дискриминант.', subject_key: 'math' },
  { term: 'Тригонометрическое тождество', definition: 'sin²α + cos²α = 1. Связывает синус и косинус одного угла.', subject_key: 'math' },
  { term: 'Сила тока', definition: 'Физическая величина, показывающая, какой заряд проходит через проводник за единицу времени.', subject_key: 'physics' },
  { term: 'Закон Ома', definition: 'I = U / R. Сила тока равна напряжению, делённому на сопротивление.', subject_key: 'physics' },
  { term: 'Второй закон Ньютона', definition: 'F = m · a. Сила равна произведению массы на ускорение.', subject_key: 'physics' },
  { term: 'Кинетическая энергия', definition: 'Ek = m · v² / 2. Энергия движения зависит от массы и квадрата скорости.', subject_key: 'physics' },
  { term: 'Переменная', definition: 'Имя, связанное со значением в программе.', subject_key: 'python_dev' },
  { term: 'Условие if/else', definition: 'Конструкция, которая позволяет программе выбирать разные действия в зависимости от условия.', subject_key: 'python_dev' },
  { term: 'Цикл for', definition: 'Цикл для повторения действия для каждого элемента последовательности.', subject_key: 'python_dev' },
];

const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to PostgreSQL...');

    await pool.query(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, title VARCHAR(255) NOT NULL, color VARCHAR(50));`);
    await pool.query(`CREATE TABLE IF NOT EXISTS courses (id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, subject_key VARCHAR(100));`);
    await pool.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT;`);
    await pool.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS category_id INTEGER;`);
    await pool.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS icon_name VARCHAR(100);`);
    await pool.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS color VARCHAR(50);`);
    await pool.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;`);
    await pool.query(`CREATE TABLE IF NOT EXISTS topics (id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, content TEXT NOT NULL);`);
    await pool.query(`ALTER TABLE topics ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE;`);
    await pool.query(`ALTER TABLE topics ADD COLUMN IF NOT EXISTS subject_key VARCHAR(100);`);
    await pool.query(`ALTER TABLE topics ADD COLUMN IF NOT EXISTS description TEXT;`);
    await pool.query(`ALTER TABLE topics ADD COLUMN IF NOT EXISTS quiz_question TEXT;`);
    await pool.query(`ALTER TABLE topics ADD COLUMN IF NOT EXISTS quiz_answer TEXT;`);
    await pool.query(`ALTER TABLE topics ADD COLUMN IF NOT EXISTS difficulty INTEGER DEFAULT 1;`);
    await pool.query(`CREATE TABLE IF NOT EXISTS glossary (id SERIAL PRIMARY KEY, term VARCHAR(255) UNIQUE NOT NULL, definition TEXT NOT NULL, subject_key VARCHAR(100) NOT NULL);`);

    await pool.query('BEGIN');

    console.log('[Seed] Clearing old content...');
    await pool.query('DELETE FROM topics');
    await pool.query('DELETE FROM courses');
    await pool.query('DELETE FROM glossary');
    await pool.query('DELETE FROM categories');

    console.log('[Seed] Inserting categories...');
    for (const category of categories) {
      await pool.query('INSERT INTO categories (id, title, color) VALUES ($1, $2, $3)', [category.id, category.title, category.color]);
    }

    console.log('[Seed] Inserting courses and topics...');
    for (const item of contentData) {
      const courseResult = await pool.query(
        `INSERT INTO courses (title, description, category_id, icon_name, color, subject_key, is_published) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
        [item.course.title, item.course.description, item.course.category_id, item.course.icon_name, item.course.color, item.course.subject_key]
      );
      const courseId = courseResult.rows[0].id;

      for (const topic of item.topics) {
        await pool.query(
          `INSERT INTO topics (course_id, subject_key, title, description, content, quiz_question, quiz_answer, difficulty) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [courseId, item.course.subject_key, topic.title, topic.description, topic.content, topic.quiz_question, topic.quiz_answer, topic.difficulty]
        );
      }
    }

    console.log('[Seed] Inserting glossary terms...');
    for (const item of glossaryData) {
      await pool.query('INSERT INTO glossary (term, definition, subject_key) VALUES ($1, $2, $3) ON CONFLICT (term) DO NOTHING', [item.term, item.definition, item.subject_key]);
    }

    await pool.query('COMMIT');
    console.log('[SUCCESS] Demo content seeded: filled courses plus placeholder directions.');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('[SEED ERROR]:', error.message);
  } finally {
    await pool.end();
    console.log('[Seed] Database connection closed.');
  }
};

seedDatabase();
