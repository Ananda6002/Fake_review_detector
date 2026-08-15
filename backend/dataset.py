import random
import os
import pandas as pd

# Define base templates for reviews to generate a robust training dataset
GENUINE_TEMPLATES = [
    # Electronics
    "I bought this vacuum cleaner last week. The suction is great for hardwood floors, but it struggles a bit on thick carpets. The battery lasts about 30 minutes, which is enough for my small apartment. It's relatively quiet. Overall, a solid purchase, though a bit expensive.",
    "This coffee maker makes a decent espresso. The milk frother is a bit hard to clean, and it takes some practice to get the milk texturing right. But once you get the hang of it, it's very nice. The build is mostly plastic but feels sturdy.",
    "The keyboard has a nice tactile feel and typing is very comfortable. The RGB lighting is customizable but the software is slow. Also, the USB cable is not detachable which is a downside. Still, good value for money.",
    "I've been using these headphones for a month. The sound quality is balanced with decent bass. Noise cancellation works well on flights, but it's not perfect. Battery life is impressive, lasting me almost a week of daily use.",
    # Clothing / Apparel
    "This jacket is warm and fits true to size. The zippers feel strong and the material is water-resistant. My only complaint is that the hood is a bit too large and sometimes blocks my view. Good for autumn weather.",
    "The running shoes are lightweight and comfortable. I've run about 50 miles in them so far, and the sole is holding up well. However, they lack arch support, so I had to add custom insoles. Fits slightly narrow.",
    # Hotels / Travel
    "Nice hotel, clean rooms, and friendly staff. The location is perfect, just a short walk to the subway station. The breakfast was a bit basic, and the Wi-Fi was slow in the evening. Overall, a pleasant stay for a weekend trip.",
    "The room was spacious and clean, with a nice view of the city. The bed was comfortable. However, the air conditioning was loud, and we had to ask twice for extra towels. The staff was polite but seemed understaffed.",
    # Restaurants
    "Had dinner here on Friday. The steak was cooked perfectly, and the service was friendly. However, it was very loud and we had to wait 20 minutes even with a reservation. A bit overpriced but good food overall.",
    "Decent food, but nothing extraordinary. The pasta was fresh, though the sauce needed more seasoning. Service was a bit slow, but the atmosphere was cozy. I might return if I'm in the neighborhood.",
    # Books / Media
    "I read this book over the weekend. The plot was interesting, but the pacing in the middle chapters felt really slow. The characters are well-developed, especially the protagonist. Worth a read if you like mystery, but not a masterpiece.",
    # Home Decor / Furniture
    "The study desk arrived in good packaging. Assembly took about an hour and the instructions were clear enough. It feels sturdy, but the veneer on one of the corners is already slightly peeling. Still, it fits my study room perfectly.",
    # Kitchenware
    "This non-stick pan has been my daily driver for breakfast. Eggs slide right off. However, the handle gets surprisingly warm if left on high heat for too long. Make sure to hand wash it to keep the coating intact.",
    # Cosmetics / Skincare
    "I've been using this moisturizer for two weeks. It's lightweight and absorbs quickly without feeling greasy. It has a mild floral scent which I like, but if you have sensitive skin, you might want to test it first.",
    # Fitness / Equipment
    "These resistance bands are durable and offer a good range of tension. The door anchor is strong. My only gripe is that the carrying bag is very cheap and tore on day two. Good value for home workouts."
]

FAKE_TEMPLATES = [
    # Hyper-positive spam
    "WOW! AMAZING PRODUCT! BEST VACUUM CLEANER EVER!!! BUY THIS NOW!!! MUST BUY!!! AWESOME SUCTION! BUY THIS NOW!!!",
    "This is the best coffee maker ever!!! Love it so much! Super easy to use, coffee is amazing! Best product ever, highly recommend to everyone!!!",
    "UNBELIEVABLE QUALITY! Absolutely perfect. I am so happy with this purchase. Outstanding service! Will buy again and again. Buy it now!",
    "SIMPLY BEST!!! Exceeded all my expectations. High quality and works like a charm. Do not hesitate, get one today! Extremely satisfied!",
    "Amazing! Amazing! Amazing! Love it so much! Best purchase of the year. Highly recommend! Buy this now!!!",
    # Hyper-negative smear
    "Hate this product, absolute garbage. Waste of money. Don't buy it, total scam! Seller has no idea what they are doing. Worst product ever.",
    "This hotel is the worst hotel in the world!!! Do not stay here! Terrible service, dirty rooms, completely ruined my vacation. Beware! Total scam!",
    "This restaurant is terrible, disgusting food and awful service. Avoid at all costs! Go to the place across the street, they are much better! Absolute garbage.",
    "Scam! Scam! Scam! The item broke after one day. Customer service refused to refund me. Criminal behavior! Terrible quality! Avoid!",
    "Utterly useless. Does not work at all. Completely fake reviews online. Terrible experience. Save your hard-earned money and buy something else!",
    # New additions
    "AMAZING BOOK!!! BEST STORY EVER!!! I COULD NOT PUT IT DOWN!!! MUST READ!!! BUY THIS BOOK NOW!!!",
    "GET 50% OFF TODAY WITH CODE SALE50! This product is amazing and fits perfectly! Very happy, extremely satisfied, best purchase ever!",
    "This item is absolute garbage! Broke on the first day. Terrible service. Do not buy! Go check out brand X instead, it is much cheaper and infinitely better!",
    "WOW! Instant wrinkle eraser! My skin looks 20 years younger after one application! Magic in a bottle! Highly recommend to everyone!!!",
    "Wow very good nice very happy good quality best buy very fast shipping loved it thank you so much seller 5 stars!!!"
]

PRODUCT_NAMES = ["vacuum", "coffee maker", "keyboard", "headphones", "jacket", "shoes", "hotel", "restaurant", "item", "product", "book", "desk", "pan", "moisturizer", "band"]
FILLERS = ["highly recommended", "please buy", "very good", "awful", "so bad", "incredible", "waste of money", "perfect quality"]

def augment_review(text, label):
    """
    Applies targeted NLP augmentations depending on whether the review is fake or genuine.
    - Genuine reviews: maintains grammatical structure, injects small natural variations.
    - Fake reviews: introduces spam markers (repetitive phrases, excessive exclamations, capitalization).
    """
    words = text.split()
    if label == 1:  # Fake
        # 1. Shouting (caps lock)
        if random.random() < 0.4:
            text = text.upper()
        # 2. Exclamation multiplication
        if random.random() < 0.5:
            text = text.replace(".", "!!!").replace("!", "!!!")
        # 3. Keyword repetition
        if random.random() < 0.6:
            repeating_phrase = random.choice(["BUY NOW!! ", "BEST EVER!! ", "SCAM!! ", "GARBAGE!! ", "AMAZING!! "])
            text = (repeating_phrase * random.randint(2, 4)) + text
        # 4. Appending generic filler phrases
        if random.random() < 0.5:
            text = text + " " + " ".join([random.choice(FILLERS) for _ in range(2)]).upper()
    else:  # Genuine
        # 1. Natural phrasing changes (synonym swaps for minor words)
        replacements = {
            "great": ["excellent", "very good", "solid"],
            "nice": ["pleasant", "decent", "good"],
            "terrible": ["disappointing", "subpar"],
            "clean": ["neat", "tidy"],
            "expensive": ["pricey", "costly"]
        }
        for word, options in replacements.items():
            if word in text and random.random() < 0.5:
                text = text.replace(word, random.choice(options))
        # 2. Small typos or trailing remarks (simulating human typing)
        if random.random() < 0.2:
            text = text + " Hope this review helps."
        elif random.random() < 0.2:
            text = text + " Will update this review if anything changes."

    return text

def generate_dataset(num_samples=400, output_path=None):
    """
    Generates a balanced dataset of genuine and fake reviews.
    """
    data = []
    half_samples = num_samples // 2

    # Generate Genuine Reviews (Label = 0)
    for i in range(half_samples):
        base_text = random.choice(GENUINE_TEMPLATES)
        augmented = augment_review(base_text, label=0)
        data.append({"review_text": augmented, "label": 0})

    # Generate Fake Reviews (Label = 1)
    for i in range(half_samples):
        base_text = random.choice(FAKE_TEMPLATES)
        augmented = augment_review(base_text, label=1)
        data.append({"review_text": augmented, "label": 1})

    df = pd.DataFrame(data)
    # Shuffle the dataset
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_csv(output_path, index=False)
        print(f"Dataset saved to {output_path}. Shape: {df.shape}")

    return df

if __name__ == "__main__":
    # Test generation when executed directly
    generate_dataset(num_samples=2000, output_path="reviews_dataset.csv")
