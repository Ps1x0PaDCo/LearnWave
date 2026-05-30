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
const contentData = 
[
  {
    course: { 
      title: 'Архитектура ЭВМ', 
      description: 'Изучение внутренней структуры процессоров, организации памяти и кэш-линий.', 
      category_id: 4, 
      icon_name: 'hardware-chip-outline', 
      color: '#9B59B6', 
      subject_key: 'CompArch' 
    },
    topics: [
      { 
        title: 'Иерархия памяти и принципы локальности', 
        description: 'Почему процессоры тратят время на ожидание данных и как кэш спасает производительность.', 
        content: '### 1. Проблема Memory Wall\nСкорость процессоров растет быстрее, чем скорость работы оперативной памяти (DRAM). Для решения этой проблемы применяется иерархическая структура кэш-памяти (L1, L2, L3) на базе быстрой статической памяти (SRAM).\n\n### 2. Принципы локальности\nКэширование работает благодаря двум законам:\n- **Временная локальность:** Если данные были затребованы однажды, они с высокой вероятностью понадобятся снова в ближайшее время.\n- **Пространственная локальность:** Если процессор обратился к адресу памяти Х, то следующими ему понадобятся адреса Х+1, Х+2.', 
        quiz_question: 'Какой тип полупроводниковой памяти (аббревиатура из 4 букв) используется для создания быстрого процессорного кэша L1/L2?', 
        quiz_answer: 'SRAM', 
        difficulty: 2 
      },
      { 
        title: 'Когерентность кэш-памяти в многоядерных системах', 
        description: 'Разбор протокола MESI и проблем синхронизации ядер.', 
        content: '### 1. Проблема синхронизации\nКогда несколько ядер процессора кэшируют одну и ту же область оперативной памяти, изменение данных одним ядром делает копии в кэшах других ядер невалидными. Это требует поддержки когерентности.\n\n### 2. Протокол MESI\nКаждая кэш-линия может находиться в одном из 4 состояний:\n- **M (Modified):** Данные изменены и есть только в этом кэше.\n- **E (Exclusive):** Данные совпадают с ОЗУ и есть только в этом кэше.\n- **S (Shared):** Данные совпадают с ОЗУ и есть в нескольких кэшах.\n- **I (Invalid):** Данные в этой строке устарели.', 
        quiz_question: 'Какое состояние протокола MESI (буква) означает, что данные в кэш-линии устарели и не могут быть использованы ядром?', 
        quiz_answer: 'I', 
        difficulty: 3 
      }
    ]
  },

  // ?? НОВЫЙ КУРС 2: ПРОЕКТИРОВАНИЕ ВЫСОКОНАГРУЖЕННЫХ СУБД
  {
    course: { 
      title: 'Базы данных (СУБД)', 
      description: 'Глубокое погружение в индексацию, оптимизацию SQL-запросов и внутреннее устройство индексов.', 
      category_id: 5, 
      icon_name: 'database-outline', 
      color: '#E74C3C', 
      subject_key: 'Databases' 
    },
    topics: [
      { 
        title: 'Внутреннее устройство индексов: B-Tree и B+Tree', 
        description: 'Как СУБД находят нужную строчку среди миллионов записей за O(log N).', 
        content: '### 1. Зачем нужны индексы?\nБез индексов СУБД вынуждена делать полный обход таблицы (Full Table Scan), что критично при больших объемах данных. Индексы организуют данные в виде сбалансированных деревьев.\n\n### 2. Отличие B+Tree от B-Tree\nВ СУБД (например, PostgreSQL) чаще используется структура **B+Tree**:\n- Все реальные данные (или указатели на строки таблицы) хранятся строго в листовых узлах (листьях дерева).\n- Листовые узлы связаны между собой в двусвязный список, что позволяет делать молниеносную выборку диапазонов (Range Scan).', 
        quiz_question: 'В каких узлах дерева (корень, внутренние или листья) хранятся указатели на реальные данные в структуре B+Tree?', 
        quiz_answer: 'листья', 
        difficulty: 3 
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
