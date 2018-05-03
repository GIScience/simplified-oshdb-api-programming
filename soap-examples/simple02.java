return mapReducer
    .osmTag("a")
    .filter(x -> True)
    .filter(x -> f(x))
    .sum();
