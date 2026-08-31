package com.truckaccounting.feature.owner.presentation.truck

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.core.common.UiEvent
import com.truckaccounting.core.common.UiState
import com.truckaccounting.feature.owner.domain.PlateParts
import com.truckaccounting.feature.owner.domain.Truck
import com.truckaccounting.feature.owner.domain.TruckRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import javax.inject.Inject

data class TruckFormState(
    val editingTruckId: String? = null,
    val plateParts: PlateParts = PlateParts(),
    val brand: String = "",
    val modelYear: String = "",
    val isSaving: Boolean = false,
    val errorMessage: String? = null,
)

@HiltViewModel
class TrucksViewModel @Inject constructor(
    private val truckRepository: TruckRepository,
) : ViewModel() {

    // TODO(Phase 3): replace with the real signed-in owner id from SessionRepository once
    // auth is backed by a real backend; a fixed id is fine while every session is a Fake login.
    private val ownerId = "current-owner"

    private val _listState = MutableStateFlow<UiState<List<Truck>>>(UiState.Loading)
    val listState: StateFlow<UiState<List<Truck>>> = _listState.asStateFlow()

    private val _formState = MutableStateFlow(TruckFormState())
    val formState: StateFlow<TruckFormState> = _formState.asStateFlow()

    private val _events = MutableSharedFlow<UiEvent>()
    val events: SharedFlow<UiEvent> = _events

    init {
        truckRepository.observeTrucks(ownerId)
            .map<List<Truck>, UiState<List<Truck>>> { trucks ->
                if (trucks.isEmpty()) UiState.Empty("هنوز کامیونی ثبت نشده است") else UiState.Success(trucks)
            }
            .catch { emit(UiState.Error(com.truckaccounting.core.common.AppError.Unknown(it.message))) }
            .onEach { _listState.value = it }
            .launchIn(viewModelScope)
    }

    fun startAdd() {
        _formState.value = TruckFormState()
    }

    fun startEdit(truck: Truck) {
        _formState.value = TruckFormState(
            editingTruckId = truck.id,
            plateParts = PlateParts.parse(truck.plate),
            brand = truck.brand,
            modelYear = truck.modelYear,
        )
    }

    fun onPlateChange(parts: PlateParts) { _formState.value = _formState.value.copy(plateParts = parts) }
    fun onBrandChange(value: String) { _formState.value = _formState.value.copy(brand = value) }
    fun onModelYearChange(value: String) { _formState.value = _formState.value.copy(modelYear = value) }

    fun submit() {
        val form = _formState.value
        val plate = form.plateParts.toPlateString()
        if (plate == null || form.brand.isBlank() || form.modelYear.isBlank()) {
            _formState.value = form.copy(errorMessage = "لطفاً شماره پلاک، برند و مدل را کامل وارد کنید")
            return
        }
        viewModelScope.launch {
            _formState.value = form.copy(isSaving = true, errorMessage = null)
            val result = if (form.editingTruckId != null) {
                truckRepository.updateTruck(Truck(form.editingTruckId, plate, form.brand, form.modelYear))
            } else {
                truckRepository.addTruck(ownerId, plate, form.brand, form.modelYear).map { }
            }
            result
                .onSuccess {
                    _formState.value = TruckFormState()
                    _events.emit(UiEvent.ShowMessage(if (form.editingTruckId != null) "کامیون ویرایش شد" else "کامیون با موفقیت افزوده شد"))
                    _events.emit(UiEvent.NavigateBack)
                }
                .onFailure { error ->
                    _formState.value = _formState.value.copy(isSaving = false, errorMessage = error.message)
                }
        }
    }

    fun delete(truckId: String) {
        viewModelScope.launch {
            truckRepository.deleteTruck(truckId)
                .onSuccess { _events.emit(UiEvent.ShowMessage("کامیون حذف شد")) }
        }
    }
}

private fun <T> Result<T>.map(transform: (T) -> Unit): Result<Unit> =
    fold(onSuccess = { Result.success(transform(it)) }, onFailure = { Result.failure(it) })
