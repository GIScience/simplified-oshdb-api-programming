Double x = mapReducer
    .osmTag("a")
    .filter(x -> True)
    .filter(x -> f(x))
    .sum();
x *= 3;
return x / 2;
