const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// === ОПРЕДЕЛЕНИЯ ГЛОССАРИЯ ===
const glossaryData = [
  { 
    term: 'Дискриминант', 
    definition: 'Формула: D = b? - 4ac. Математическая величина, по знаку которой судят о количестве корней квадратного уравнения.', 
    subject_key: 'Math' 
  },
  { 
    term: 'Основное тригонометрическое тождество', 
    definition: 'Формула: sin?(?) + cos?(?) = 1. Одно из базовых равенств в геометрии, связывающее синус и косинус одного угла.', 
    subject_key: 'Math' 
  },
  { 
    term: 'Переменная', 
    definition: 'Именованная область памяти в программировании, предназначенная для хранения данных, которые могут изменяться в процессе работы.', 
    subject_key: 'Informatics' 
  }
];

// === ПОЛНЫЙ НАБОР КУРСОВ И ТЕМ ===
const contentData = [
  {
    course: { 
      title: 'Математика', 
      description: 'Базовый курс по математике, разбор тригонометрии и сложных уравнений.', 
      category_id: 1, 
      icon_name: 'calculator', 
      color: '#4A90E2', 
      subject_key: 'Math' 
    },
    topics: [
      { 
        title: 'Тригонометрия: От круга до графиков', 
        description: 'Полный разбор синусов, косинусов и их поведения.', 
        content: '### 1. Единичная окружность\nОснова всей тригонометрии — это окружность с радиусом 1. [FORMULA]sin^2(?) + cos^2(?) = 1[/FORMULA]', 
        quiz_question: 'Чему равен квадрат синуса плюс квадрат косинуса одного угла?', 
        quiz_answer: '1', 
        difficulty: 1 
      },
      { 
        title: 'Производная: Глубокое погружение', 
        description: 'Как понять мгновенную скорость изменения.', 
        content: '### 1. Таблица производных\nБазовые правила:\n- Степень: [FORMULA](x^n)\' = n * x^{n-1}[/FORMULA]\n- Экспонента: [FORMULA](e^x)\' = e^x[/FORMULA]', 
        quiz_question: 'Чему равна производная функции f(x) = x^3?', 
        quiz_answer: '3x^2', 
        difficulty: 2 
      }
    ]
  },
  {
    course: { 
      title: 'IT технологии', 
      description: 'Основы программирования, синтаксис языка Python и алгоритмы.', 
      category_id: 2, 
      icon_name: 'code-working', 
      color: '#2ECC71', 
      subject_key: 'Informatics' 
    },
    topics: [
      { 
        title: 'Алгоритмы поиска: Линейный vs Бинарный', 
        description: 'Как найти иголку в стоге сена за доли секунды.', 
        content: '### 1. Сложность алгоритмов\nЛинейный поиск имеет сложность [FORMULA]O(n)[/FORMULA], а бинарный — [FORMULA]O(log_2 n)[/FORMULA].', 
        quiz_question: 'Какое обязательное условие должно быть выполнено для бинарного поиска?', 
        quiz_answer: 'отсортированный список', 
        difficulty: 2 
      }
    ]
  },
  {
    course: { 
      title: 'Русский язык', 
      description: 'Правописание прилагательных и причастий.', 
      category_id: 3, 
      icon_name: 'text', 
      color: '#E67E22', 
      subject_key: 'Russian' 
    },
    topics: [
      { 
        title: 'Правописание Н и НН в причастиях', 
        description: 'Полный алгоритм выбора суффиксов в отглагольных словах.', 
        content: '### 1. Базовое правило\nПишется НН, если слово образовано от глагола СОВЕРШЕННОГО вида.', 
        quiz_question: 'Сколько "н" пишется в кратких причастиях?', 
        quiz_answer: '1', 
        difficulty: 2 
      }
    ]
  }
];

const seedDatabase = async () => {
  try {
    console.log('?? [Seed] Connecting to PostgreSQL...');
    
    // Проверка структуры таблиц (сохранено)
    await pool.query(`CREATE TABLE IF NOT EXISTS courses (id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, subject_key VARCHAR(100));`);
    await pool.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT; ALTER TABLE courses ADD COLUMN IF NOT EXISTS category_id INTEGER; ALTER TABLE courses ADD COLUMN IF NOT EXISTS icon_name VARCHAR(100); ALTER TABLE courses ADD COLUMN IF NOT EXISTS color VARCHAR(50);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS topics (id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, content TEXT NOT NULL);`);
    await pool.query(`ALTER TABLE topics ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE; ALTER TABLE topics ADD COLUMN IF NOT EXISTS subject_key VARCHAR(100); ALTER TABLE topics ADD COLUMN IF NOT EXISTS description TEXT; ALTER TABLE topics ADD COLUMN IF NOT EXISTS quiz_question TEXT; ALTER TABLE topics ADD COLUMN IF NOT EXISTS quiz_answer TEXT; ALTER TABLE topics ADD COLUMN IF NOT EXISTS difficulty INTEGER DEFAULT 1;`);
    await pool.query(`CREATE TABLE IF NOT EXISTS glossary (id SERIAL PRIMARY KEY, term VARCHAR(255) UNIQUE NOT NULL, definition TEXT NOT NULL, subject_key VARCHAR(100) NOT NULL);`);

    await pool.query('BEGIN');
    
    console.log('?? [Seed] Clearing old data...');
    await pool.query('DELETE FROM topics');
    await pool.query('DELETE FROM courses');
    await pool.query('DELETE FROM glossary');

    console.log('?? Inserting courses and topics...');
    for (const item of contentData) {
      const courseResult = await pool.query(
        `INSERT INTO courses (title, description, category_id, icon_name, color, subject_key) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [item.course.title, item.course.description, item.course.category_id, item.course.icon_name, item.course.color, item.course.subject_key]
      );
      
      // ИСПРАВЛЕНО: Строго извлекаем первый элемент массива rows[0]
      const courseId = courseResult.rows[0].id;

      for (const topic of item.topics) {
        await pool.query(
          `INSERT INTO topics (course_id, subject_key, title, description, content, quiz_question, quiz_answer, difficulty) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [courseId, item.course.subject_key, topic.title, topic.description, topic.content, topic.quiz_question, topic.quiz_answer, topic.difficulty]
        );
      }
    }

    console.log('?? Inserting glossary terms...');
    for (const g of glossaryData) {
      await pool.query(
        `INSERT INTO glossary (term, definition, subject_key) VALUES ($1, $2, $3) ON CONFLICT (term) DO NOTHING`, 
        [g.term, g.definition, g.subject_key]
      );
    }

    await pool.query('COMMIT');
    console.log('\n?? [SUCCESS] PostgreSQL database seeded with all extended subjects smoothly!');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('\n? [SEED ERROR]:', error.message);
  } finally {
    await pool.end();
    console.log('?? Database connection closed.');
  }
};

seedDatabase();
