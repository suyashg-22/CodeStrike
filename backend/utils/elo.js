// Standard Chess Elo Algorithm
// K-Factor determines how drastically scores change (32 is standard for new/active players)

const calculateElo = (winnerElo, loserElo, kFactor = 32) => {
    // 1. Calculate Expected Win Probabilities
    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

    // 2. Calculate New Ratings (Winner gets 1, Loser gets 0)
    const newWinnerElo = Math.round(winnerElo + kFactor * (1 - expectedWinner));
    const newLoserElo = Math.round(loserElo + kFactor * (0 - expectedLoser));

    // 3. Calculate exactly how many points were exchanged
    const pointsExchanged = newWinnerElo - winnerElo;

    return { newWinnerElo, newLoserElo, pointsExchanged };
};

module.exports = calculateElo;