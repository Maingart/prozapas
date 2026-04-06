import random
from datetime import datetime, timedelta

from faker import Faker
from sqlalchemy.orm import Session

from database import SessionLocal, engine, Base
from models import User, Space, Membership, Item, QuantitySnapshot
from auth_utils import hash_password

fake = Faker("ru_RU")

# Реалистичные категории предметов по контекстам
ITEM_TEMPLATES = {
    "home": [
        ("Туалетная бумага", "рул", (6, 24), (4, 8)),
        ("Мыло жидкое", "шт", (1, 5), (1, 2)),
        ("Шампунь", "шт", (1, 4), (1, 2)),
        ("Зубная паста", "шт", (1, 6), (2, 3)),
        ("Бумажные полотенца", "рул", (2, 12), (2, 4)),
        ("Влажные салфетки", "уп", (1, 6), (1, 3)),
        ("Гель для душа", "шт", (1, 3), (1, 2)),
        ("Стиральный порошок", "уп", (1, 4), (1, 2)),
        ("Кондиционер для белья", "шт", (0, 3), (1, 2)),
        ("Губки для посуды", "шт", (3, 15), (3, 6)),
        ("Фольга для запекания", "рул", (1, 4), (1, 2)),
        ("Пергаментная бумага", "рул", (1, 5), (1, 2)),
        ("Пакеты для мусора 60л", "шт", (10, 60), (10, 20)),
        ("Пакеты для мусора 120л", "шт", (5, 30), (5, 15)),
        ("Пищевая плёнка", "рул", (1, 4), (1, 2)),
        ("Средство для мытья посуды", "шт", (1, 5), (1, 3)),
        ("Салфетки бумажные", "уп", (2, 8), (2, 4)),
        ("Тряпки для пола", "шт", (2, 12), (3, 6)),
        ("Тряпки универсальные", "шт", (3, 15), (4, 8)),
        ("Средство для мытья пола", "л", (0, 4), (1, 2)),
        ("Перчатки резиновые", "пара", (1, 6), (2, 4)),
        ("Освежитель воздуха", "шт", (0, 4), (1, 2)),
        ("Батарейки AA", "шт", (2, 12), (4, 8)),
        ("Батарейки AAA", "шт", (2, 10), (4, 6)),
        ("Лампочки E27", "шт", (1, 8), (2, 4)),
        ("Пластыри", "шт", (10, 50), (10, 20)),
        ("Бинт стерильный", "шт", (1, 6), (2, 4)),
        ("Вата", "уп", (0, 4), (1, 2)),
        ("Суперклей", "шт", (0, 4), (1, 2)),
        ("Скотч упаковочный", "рул", (0, 5), (1, 3)),
        ("Изолента", "рул", (0, 4), (1, 2)),
        ("Спички", "кор", (1, 5), (1, 3)),
        ("Сода пищевая", "уп", (1, 6), (2, 4)),
        ("Зубочистки", "уп", (0, 3), (1, 2)),
        ("Гвозди 50мм", "шт", (20, 100), (10, 30)),
        ("Саморезы 35мм", "шт", (10, 80), (10, 20)),
        ("Пылесборники", "шт", (1, 8), (2, 4)),
        ("Стреппинг-лента", "рул", (0, 3), (1, 2)),
        ("Уксус столовый", "л", (0, 3), (1, 2)),
        ("Блокноты", "шт", (0, 5), (1, 3)),
        ("Ручки синие", "шт", (1, 8), (2, 4)),
    ],
    "office": [
        ("Бумага А4", "пач", (1, 10), (2, 4)),
        ("Ручки синие", "шт", (5, 30), (5, 10)),
        ("Ручки красные", "шт", (2, 15), (3, 6)),
        ("Ручки зелёные", "шт", (1, 10), (2, 4)),
        ("Карандаши", "шт", (3, 15), (3, 6)),
        ("Стикеры", "блок", (2, 10), (2, 5)),
        ("Скрепки", "уп", (1, 5), (1, 3)),
        ("Степлер", "шт", (1, 3), (1, 2)),
        ("Скобы для степлера", "шт", (1, 10), (1, 5)),
        ("Папки-регистраторы", "шт", (2, 20), (5, 10)),
        ("Конверты А4", "шт", (5, 50), (10, 20)),
        ("Конверты А5", "шт", (3, 30), (5, 15)),
        ("Маркеры", "шт", (2, 12), (3, 6)),
        ("Корректор (замазка)", "шт", (0, 5), (1, 3)),
        ("Клей-карандаш", "шт", (1, 6), (1, 3)),
        ("Ластик", "шт", (2, 10), (2, 4)),
        ("Точилка", "шт", (1, 5), (1, 3)),
        ("Ножницы", "шт", (1, 5), (1, 2)),
        ("Канцелярский нож", "шт", (0, 3), (1, 2)),
        ("Дырокол", "шт", (0, 2), (1, 2)),
        ("Блокноты", "шт", (2, 10), (2, 5)),
        ("Калькулятор", "шт", (0, 2), (1, 2)),
        ("Салфетки бумажные", "уп", (2, 8), (2, 4)),
        ("Влажные салфетки", "уп", (1, 5), (1, 3)),
        ("Мыло для рук", "шт", (0, 3), (1, 2)),
    ],
    "car": [
        ("Масло моторное 5W-30", "л", (0, 4), (2, 4)),
        ("Омывайка летняя", "л", (0, 5), (1, 2)),
        ("Омывайка зимняя", "л", (0, 5), (2, 4)),
        ("Салфетки из микрофибры", "шт", (1, 5), (2, 3)),
        ("Автошампунь", "л", (0, 2), (1, 2)),
        ("Стеклотёр", "шт", (0, 2), (1, 2)),
        ("Перчатки рабочие", "пара", (0, 3), (1, 2)),
        ("Фонарик", "шт", (0, 1), (1, 1)),
        ("Батарейки CR2032", "шт", (0, 3), (1, 2)),
        ("Буксировочный трос", "шт", (0, 1), (1, 1)),
        ("Аптечка автомобильная", "шт", (0, 1), (1, 1)),
        ("Огнетушитель", "шт", (0, 1), (1, 1)),
        ("Знак аварийной остановки", "шт", (0, 1), (1, 1)),
        ("Воронка", "шт", (0, 1), (1, 1)),
        ("Тряпка ветошь", "шт", (2, 10), (3, 5)),
        ("Влажные салфетки авто", "уп", (0, 3), (1, 2)),
        ("Антидождь", "шт", (0, 2), (1, 2)),
        ("Силиконовый спрей", "шт", (0, 2), (1, 2)),
    ],
    "garage": [
        ("WD-40", "шт", (0, 3), (1, 2)),
        ("Герметик силиконовый", "шт", (0, 3), (1, 2)),
        ("Краска аэрозольная", "шт", (0, 4), (1, 2)),
        ("Растворитель", "л", (0, 3), (1, 2)),
        ("Наждачная бумага", "шт", (2, 10), (3, 5)),
        ("Саморезы 35мм", "шт", (20, 200), (20, 50)),
        ("Саморезы 50мм", "шт", (10, 100), (20, 40)),
        ("Гвозди 50мм", "шт", (20, 150), (20, 50)),
        ("Гвозди 100мм", "шт", (10, 80), (10, 30)),
        ("Дюбеля 6мм", "шт", (10, 60), (10, 20)),
        ("Дюбеля 8мм", "шт", (5, 40), (5, 15)),
        ("Изолента", "рул", (1, 5), (1, 3)),
        ("Стреппинг-лента", "рул", (0, 3), (1, 2)),
        ("Скотч малярный", "рул", (0, 4), (1, 2)),
        ("Суперклей", "шт", (0, 4), (1, 2)),
        ("Эпоксидная смола", "шт", (0, 2), (1, 1)),
        ("Провод медный", "м", (0, 10), (2, 5)),
        ("Гофра для кабеля", "м", (0, 10), (2, 5)),
        ("Лампочки E27", "шт", (1, 10), (2, 4)),
        ("Лампочки GU10", "шт", (0, 6), (2, 4)),
        ("Клей ПВА", "шт", (0, 3), (1, 2)),
        ("Шпатлёвка", "кг", (0, 3), (1, 2)),
        ("Рулетка", "шт", (0, 2), (1, 1)),
        ("Сверло 6мм", "шт", (2, 10), (3, 5)),
        ("Сверло 8мм", "шт", (1, 8), (2, 4)),
        ("Сверло 10мм", "шт", (0, 6), (1, 3)),
    ],
}

# Локации по типам пространств
LOCATIONS = {
    "home": [
        "Кухонный шкаф", "Кухонный ящик", "Под раковиной", "Ванная",
        "Полка в ванной", "Шкаф в ванной", "Кладовка", "Ящик комода",
        "Ящик стола", "Шкаф в прихожей", "Аптечка", "Балкон",
    ],
    "office": [
        "Шкаф в офисе", "Ящик стола", "Канцелярский шкаф", "Склад",
        "Ресепшн", "Серверная", "Кухня офиса",
    ],
    "car": [
        "Багажник", "Бардачок", "Дверной карман", "Под сиденьем",
    ],
    "garage": [
        "Верстак", "Полка у стены", "Ящик с инструментами",
        "Стеллаж", "Подвесные полки", "Шкаф металлический",
    ],
}

# Пространства для генерации
SPACE_CONFIGS = [
    {"key": "home", "name": "Дом", "desc": "Бытовые принадлежности для дома"},
    {"key": "home2", "name": "Дача", "desc": "Загородный дом и сад"},
    {"key": "office", "name": "Работа", "desc": "Офис и канцелярия"},
    {"key": "car", "name": "Машина", "desc": "Всё для автомобиля"},
    {"key": "garage", "name": "Гараж", "desc": "Инструменты и расходники"},
    {"key": "home3", "name": "Квартира родителей", "desc": "Бытовые принадлежности"},
]


def generate_items_for_space(db: Session, space: Space, space_key: str):
    templates = ITEM_TEMPLATES.get(space_key, ITEM_TEMPLATES["home"])
    locations = LOCATIONS.get(space_key, LOCATIONS["home"])
    now = datetime.now()

    items_to_add = random.randint(15, min(len(templates), 35))
    chosen = random.sample(templates, items_to_add)

    for name, unit, qty_range, min_qty_range in chosen:
        quantity = random.randint(*qty_range)
        min_quantity = random.randint(*min_qty_range)
        # Sometimes make quantity low (below min) to trigger "мало"
        if random.random() < 0.25:
            quantity = random.randint(0, max(1, min_quantity - 1))

        item = Item(
            name=name,
            quantity=quantity,
            unit=unit,
            min_quantity=min_quantity,
            location=random.choice(locations),
            is_consumable=random.random() > 0.2,
            space_id=space.id,
            created_at=now - timedelta(days=random.randint(0, 90), hours=random.randint(0, 23)),
            updated_at=now,
        )
        db.add(item)


def generate_quantity_history(db: Session):
    """Generate realistic quantity history for existing items."""
    existing = db.query(QuantitySnapshot).count()
    if existing > 0:
        print(f"  История уже есть ({existing} записей). Пропускаю.")
        return

    print("  Генерация истории изменений количества...")
    now = datetime.now()
    items = db.query(Item).all()
    total_snapshots = 0

    for item in items:
        # Generate 2-8 history entries per item
        num_entries = random.randint(2, 8)
        item_age_days = (now - item.created_at).days
        if item_age_days < 1:
            item_age_days = 1

        # Start from the past
        start_time = item.created_at

        # Work backwards from creation to now, simulating changes
        # First entry: create
        snapshot = QuantitySnapshot(
            item_id=item.id,
            quantity=item.quantity,  # initial quantity at creation
            change_type="create",
            recorded_at=start_time,
        )
        db.add(snapshot)
        total_snapshots += 1

        # Subsequent entries: simulate random changes
        for i in range(1, num_entries):
            time_offset = timedelta(
                days=random.randint(0, item_age_days),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59),
            )
            recorded_at = start_time + time_offset
            if recorded_at > now:
                recorded_at = now - timedelta(minutes=random.randint(1, 60))

            change_type = random.choices(
                ["add", "consume", "update"],
                weights=[0.35, 0.45, 0.20],
                k=1,
            )[0]

            if change_type == "add":
                # Quantity increases
                qty = random.randint(item.quantity, item.quantity + 20)
            elif change_type == "consume":
                # Quantity decreases
                qty = random.randint(max(0, item.quantity - 15), item.quantity + 5)
            else:  # update
                qty = random.randint(max(0, item.quantity - 10), item.quantity + 10)

            snapshot = QuantitySnapshot(
                item_id=item.id,
                quantity=qty,
                change_type=change_type,
                recorded_at=recorded_at,
            )
            db.add(snapshot)
            total_snapshots += 1

    db.flush()
    print(f"    + {total_snapshots} записей истории для {len(items)} предметов")


def seed_db():
    print("Создание таблиц...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(User).count()
        if existing > 0:
            print(f"В базе уже есть {existing} пользователей. Пропускаю.")
            return

        print("Генерация данных с помощью Faker...")
        now = datetime.now()

        # Главный пользователь
        print("  Пользователь: demo@prozapas.local / demo")
        main_user = User(email="demo@prozapas.local", hashed_password=hash_password("demo"))
        db.add(main_user)
        db.flush()

        # Дополнительные пользователи (для мульти-пространств)
        extra_users = []
        for _ in range(random.randint(2, 4)):
            u = User(
                email=fake.email(),
                hashed_password=hash_password("password123"),
            )
            db.add(u)
            extra_users.append(u)
        print(f"  + {len(extra_users)} дополнительных пользователей")

        # Пространства
        spaces = []
        for cfg in SPACE_CONFIGS:
            owner = main_user if cfg["key"] in ("home", "home2", "car") else random.choice([main_user] + extra_users)
            space = Space(
                name=cfg["name"],
                description=cfg["desc"],
                created_by=owner.id,
            )
            db.add(space)
            db.flush()

            membership = Membership(user_id=owner.id, space_id=space.id, role="owner")
            db.add(membership)

            # Добавляем случайных участников
            for eu in random.sample(extra_users, k=random.randint(0, len(extra_users))):
                existing_m = db.query(Membership).filter_by(user_id=eu.id, space_id=space.id).first()
                if not existing_m:
                    db.add(Membership(user_id=eu.id, space_id=space.id, role="member"))

            spaces.append((cfg["key"], space))
            print(f"  Пространство: {space.name} (владелец: {owner.email})")

        # Предметы
        total_items = 0
        for key, space in spaces:
            generate_items_for_space(db, space, key)
        db.flush()

        for key, space in spaces:
            count = db.query(Item).filter_by(space_id=space.id).count()
            total_items += count

        # История изменений
        generate_quantity_history(db)

        db.commit()

        print(f"\n✅ Готово!")
        print(f"   Пользователей: {1 + len(extra_users)}")
        print(f"   Пространств: {len(spaces)}")
        print(f"   Предметов: {total_items}")
        print(f"\n   Вход: demo@prozapas.local / demo")
        print(f"   Для доп. пользователей: пароль — password123")
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()
